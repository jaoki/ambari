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

from unittest import TestCase
from resource_management.core import Logger

class TestLogger(TestCase):

  def test_filter_nonascii_str(self):
    # '\xe2\x86\x92' : rightwards arrow
    str = '\xe2\x86\x92 SOME_UNPROTECTED_STRING'
    Logger.sensitive_strings["SOME_UNPROTECTED_STRING"] = "SOME_PROTECTED_STRING"
    print Logger.filter_text(str)
