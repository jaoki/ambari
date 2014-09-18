#!/usr/bin/env python

'''
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
'''
from stacks.utils.RMFTestCase import *


class TestSliderClient(RMFTestCase):
  def test_configure_default(self):
    self.maxDiff = None
    self.executeScript("2.2/services/SLIDER/package/scripts/slider_client.py",
                       classname="SliderClient",
                       command="configure",
                       config_file="default.json"
    )

    self.assertResourceCalled('Directory', '/usr/lib/slider/conf'
    )

    self.assertResourceCalled('XmlConfig',
                              'slider-client.xml',
                              conf_dir='/usr/lib/slider/conf',
                              configurations=self.getConfig()['configurations']['slider-client']
    )

    self.assertResourceCalled('XmlConfig',
                              'core-site.xml',
                              conf_dir='/usr/lib/slider/conf',
                              configurations=self.getConfig()['configurations']['core-site'],
                              configuration_attributes=self.getConfig()['configuration_attributes']['core-site']
    )

    self.assertResourceCalled('XmlConfig',
                              'hdfs-site.xml',
                              conf_dir='/usr/lib/slider/conf',
                              configurations=self.getConfig()['configurations']['hdfs-site'],
                              configuration_attributes=self.getConfig()['configuration_attributes']['hdfs-site']
    )

    self.assertResourceCalled('XmlConfig',
                              'yarn-site.xml',
                              conf_dir='/usr/lib/slider/conf',
                              configurations=self.getConfig()['configurations']['yarn-site'],
                              configuration_attributes=self.getConfig()['configuration_attributes']['yarn-site']
    )

    self.assertResourceCalled('File',
                              '/usr/lib/slider/bin/slider-wrapper',
                              content=Template('slider-wrapper.j2'),
                              mode=0755
    )

    self.assertResourceCalled('File',
                              '/usr/lib/slider/conf/log4j.properties',
                              mode=0644,
                              content='log4jproperties\nline2'
    )

    self.assertNoMoreResources()


  def test_svc_check_secured(self):
    self.maxDiff = None
    self.executeScript("2.2/services/SLIDER/package/scripts/service_check.py",
                       classname="SliderServiceCheck",
                       command="service_check",
                       config_file="secured.json"
    )

    self.assertResourceCalled('Execute',
                              '/usr/bin/kinit -kt /etc/security/keytabs/smokeuser.headless.keytab ambari-qa; /usr/lib/slider/bin/slider-wrapper list',
                              logoutput=True,
                              tries=3,
                              user='ambari-qa',
                              try_sleep=5,
    )
    self.assertNoMoreResources()

  def test_svc_check_default(self):
    self.maxDiff = None
    self.executeScript("2.2/services/SLIDER/package/scripts/service_check.py",
                       classname="SliderServiceCheck",
                       command="service_check",
                       config_file="default.json"
    )

    self.assertResourceCalled('Execute', ' /usr/lib/slider/bin/slider-wrapper list',
                              logoutput=True,
                              tries=3,
                              user='ambari-qa',
                              try_sleep=5,
    )
    self.assertNoMoreResources()

