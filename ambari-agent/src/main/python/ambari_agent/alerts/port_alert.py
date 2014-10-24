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
"""

import logging
import socket
import time
from alerts.base_alert import BaseAlert
from resource_management.libraries.functions.get_port_from_url import get_port_from_url

logger = logging.getLogger()

class PortAlert(BaseAlert):

  def __init__(self, alert_meta, alert_source_meta):
    super(PortAlert, self).__init__(alert_meta, alert_source_meta)
    
    # can be parameterized
    self.uri = self._find_lookup_property(alert_source_meta['uri'])
    self.port = alert_source_meta['default_port']
    
  def _collect(self):
    urivalue = self._lookup_property_value(self.uri)

    port = self.port
    host = BaseAlert.get_host_from_url(urivalue)
    if host is None:
      host = self.host_name

    try:
      port = int(get_port_from_url(urivalue))
    except:
      # if port not found,  default port already set to port
      pass
    
    if logger.isEnabledFor(logging.DEBUG):
      logger.debug("checking {0} listening on port {1}".format(host, str(port)))
    
    try:
      s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
      s.settimeout(1.5)
      t = time.time()
      s.connect((host, port))
      millis = time.time() - t
      return (self.RESULT_OK, [millis/1000, port])
    except Exception as e:
      return (self.RESULT_CRITICAL, [str(e), host, port])
    finally:
      if s is not None:
        try:
          s.close()
        except:
          pass

