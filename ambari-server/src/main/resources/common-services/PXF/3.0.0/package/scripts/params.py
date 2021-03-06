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

import os
import functools

from resource_management import Script
from resource_management.libraries.functions.default import default
from resource_management.libraries.functions import get_kinit_path
from resource_management.libraries.resources.hdfs_resource import HdfsResource

config = Script.get_config()

pxf_service_name = "pxf-service"
stack_name = str(config["hostLevelParams"]["stack_name"])

# Users and Groups
pxf_user = "pxf"
pxf_group = pxf_user
hdfs_superuser = config['configurations']['hadoop-env']['hdfs_user']
hdfs_superuser_group = config["configurations"]["hdfs-site"]["dfs.permissions.superusergroup"]
user_group = config["configurations"]["cluster-env"]["user_group"]
tomcat_group = "tomcat"

# Directories
pxf_conf_dir = "/etc/pxf/conf"
pxf_instance_dir = "/var/pxf"

# Java home path
java_home = config["hostLevelParams"]["java_home"] if "java_home" in config["hostLevelParams"] else None

# Timeouts
default_exec_timeout = 600

# security related
security_enabled = config['configurations']['cluster-env']['security_enabled']
realm_name = config['configurations']['kerberos-env']['realm']

#HBase
is_hbase_installed = default("/clusterHostInfo/hbase_master_hosts", None) is not None

# HDFS
hdfs_site = config['configurations']['hdfs-site']
default_fs = config['configurations']['core-site']['fs.defaultFS']

security_enabled = config['configurations']['cluster-env']['security_enabled']
hdfs_user_keytab = config['configurations']['hadoop-env']['hdfs_user_keytab']
kinit_path_local = get_kinit_path(default('/configurations/kerberos-env/executable_search_paths', None))
hdfs_principal_name = config['configurations']['hadoop-env']['hdfs_principal_name']

# HDFSResource partial function
HdfsResource = functools.partial(HdfsResource,
    user=hdfs_superuser,
    security_enabled=security_enabled,
    keytab=hdfs_user_keytab,
    kinit_path_local=kinit_path_local,
    principal_name=hdfs_principal_name,
    hdfs_site=hdfs_site,
    default_fs=default_fs)

