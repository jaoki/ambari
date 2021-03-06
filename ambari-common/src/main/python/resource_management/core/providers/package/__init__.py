#!/usr/bin/env python
"""
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Ambari Agent

"""

import subprocess
import time
import re
import logging

from resource_management.core.base import Fail
from resource_management.core.providers import Provider
from resource_management.core.logger import Logger
from resource_management.core.utils import suppress_stdout
from resource_management.core import shell

PACKAGE_MANAGER_LOCK_ACQUIRED = "Package manager lock is acquired. Retrying after {0} seconds. Reason: {1}"

class PackageProvider(Provider):
  def __init__(self, *args, **kwargs):
    super(PackageProvider, self).__init__(*args, **kwargs)   
  
  def install_package(self, name, version):
    raise NotImplementedError()
  def remove_package(self, name):
    raise NotImplementedError()
  def upgrade_package(self, name, version):
    raise NotImplementedError()

  def action_install(self):
    package_name = self.get_package_name_with_version()
    self.install_package(package_name, self.resource.use_repos, self.resource.skip_repos)

  def action_upgrade(self):
    package_name = self.get_package_name_with_version()
    self.upgrade_package(package_name, self.resource.use_repos, self.resource.skip_repos)

  def action_remove(self):
    package_name = self.get_package_name_with_version()
    self.remove_package(package_name)

  def get_package_name_with_version(self):
    if self.resource.version:
      return self.resource.package_name + '-' + self.resource.version
    else:
      return self.resource.package_name
    
  def get_logoutput(self):
    return self.resource.logoutput==True and Logger.logger.isEnabledFor(logging.INFO) or self.resource.logoutput==None and Logger.logger.isEnabledFor(logging.DEBUG)
    
  def call_until_not_locked(self, cmd, **kwargs):
    return self.wait_until_not_locked(cmd, is_checked=False, **kwargs)
  
  def checked_call_until_not_locked(self, cmd, **kwargs):
    return self.wait_until_not_locked(cmd, is_checked=True, **kwargs)
    
  def wait_until_not_locked(self, cmd, is_checked=True, **kwargs):
    func = shell.checked_call if is_checked else shell.call
      
    for i in range(self.resource.locked_tries):
      is_last_time = (i == self.resource.locked_tries - 1)
      try:
        code, out = func(cmd, **kwargs)
      except Fail as ex:
        # non-lock error
        if not self.is_locked_output(str(ex)) or is_last_time:
          raise
        
        Logger.info(PACKAGE_MANAGER_LOCK_ACQUIRED.format(self.resource.locked_try_sleep, str(ex)))
      else:
        # didn't fail or failed with non-lock error.
        if not code or not self.is_locked_output(out):
           break
         
        Logger.info(PACKAGE_MANAGER_LOCK_ACQUIRED.format(self.resource.locked_try_sleep, str(out)))
      
      time.sleep(self.resource.locked_try_sleep)

    return code, out
       
    
  def yum_check_package_available(self, name):
    """
    Does the same as rpm_check_package_avaiable, but faster.
    However need root permissions.
    """
    import yum # Python Yum API is much faster then other check methods. (even then "import rpm")
    yb = yum.YumBase()
    name_regex = re.escape(name).replace("\\?", ".").replace("\\*", ".*") + '$'
    regex = re.compile(name_regex)
    
    with suppress_stdout():
      package_list = yb.rpmdb.simplePkgList()
    
    for package in package_list:
      if regex.match(package[0]):
        return True
    
    return False
  
  def rpm_check_package_available(self, name):
    import rpm # this is faster then calling 'rpm'-binary externally.
    ts = rpm.TransactionSet()
    packages = ts.dbMatch()
    
    name_regex = re.escape(name).replace("\\?", ".").replace("\\*", ".*") + '$'
    regex = re.compile(name_regex)
    
    for package in packages:
      if regex.match(package['name']):
        return True
    return False
