/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.ambari.server.controller.internal;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Updates configuration properties based on cluster topology.  This is done when exporting
 * a blueprint and when a cluster is provisioned via a blueprint.
 */
public class BlueprintConfigurationProcessor {

  /**
   * Single host topology updaters
   */
  private static Map<String, Map<String, PropertyUpdater>> singleHostTopologyUpdaters =
      new HashMap<String, Map<String, PropertyUpdater>>();

  /**
   * Multi host topology updaters
   */
  private static Map<String, Map<String, PropertyUpdater>> multiHostTopologyUpdaters =
      new HashMap<String, Map<String, PropertyUpdater>>();

  /**
   * Database host topology updaters
   */
  private static Map<String, Map<String, PropertyUpdater>> dbHostTopologyUpdaters =
      new HashMap<String, Map<String, PropertyUpdater>>();

  /**
   * Updaters for properties which need 'm' appended
   */
  private static Map<String, Map<String, PropertyUpdater>> mPropertyUpdaters =
      new HashMap<String, Map<String, PropertyUpdater>>();

  /**
   * Collection of all updaters
   */
  private static Collection<Map<String, Map<String, PropertyUpdater>>> allUpdaters =
      new ArrayList<Map<String, Map<String, PropertyUpdater>>>();

  /**
   * Compiled regex for hostgroup token.
   */
  private static Pattern HOSTGROUP_REGEX = Pattern.compile("%HOSTGROUP::(\\S+)%");

  /**
   * Compiled regex for hostgroup token with port information.
   */
  private static Pattern HOSTGROUP_PORT_REGEX = Pattern.compile("%HOSTGROUP::(\\w+|\\d+)%:?(\\d+)?");

  /**
   * Configuration properties to be updated
   */
  private Map<String, Map<String, String>> properties;


  /**
   * Constructor.
   *
   * @param properties  properties to update
   */
  public BlueprintConfigurationProcessor(Map<String, Map<String, String>> properties) {
    this.properties = properties;
  }

  /**
   * Update properties for cluster creation.  This involves updating topology related properties with
   * concrete topology information.
   *
   * @param hostGroups  host groups of cluster to be deployed
   *
   * @return  updated properties
   */
  public Map<String, Map<String, String>> doUpdateForClusterCreate(Map<String, ? extends HostGroup> hostGroups) {
    for (Map<String, Map<String, PropertyUpdater>> updaterMap : allUpdaters) {
      for (Map.Entry<String, Map<String, PropertyUpdater>> entry : updaterMap.entrySet()) {
        String type = entry.getKey();
        for (Map.Entry<String, PropertyUpdater> updaterEntry : entry.getValue().entrySet()) {
          String propertyName = updaterEntry.getKey();
          PropertyUpdater updater = updaterEntry.getValue();

          Map<String, String> typeMap = properties.get(type);
          if (typeMap != null && typeMap.containsKey(propertyName)) {
            typeMap.put(propertyName, updater.updateForClusterCreate(
                hostGroups, typeMap.get(propertyName), properties));
          }
        }
      }
    }
    return properties;
  }

  /**
   * Update properties for blueprint export.
   * This involves converting concrete topology information to host groups.
   *
   * @param hostGroups  cluster host groups
   *
   * @return  updated properties
   */
  public Map<String, Map<String, String>> doUpdateForBlueprintExport(Collection<? extends HostGroup> hostGroups) {
    doSingleHostExportUpdate(hostGroups, singleHostTopologyUpdaters);
    doSingleHostExportUpdate(hostGroups, dbHostTopologyUpdaters);
    doMultiHostExportUpdate(hostGroups, multiHostTopologyUpdaters);

    return properties;
  }

  /**
   * Update single host topology configuration properties for blueprint export.
   *
   * @param hostGroups  cluster export
   * @param updaters    registered updaters
   */
  private void doSingleHostExportUpdate(Collection<? extends HostGroup> hostGroups,
                                        Map<String, Map<String, PropertyUpdater>> updaters) {

    for (Map.Entry<String, Map<String, PropertyUpdater>> entry : updaters.entrySet()) {
      String type = entry.getKey();
      for (String propertyName : entry.getValue().keySet()) {
        boolean matchedHost = false;

        Map<String, String> typeProperties = properties.get(type);
        if (typeProperties != null && typeProperties.containsKey(propertyName)) {
          String propValue = typeProperties.get(propertyName);
          for (HostGroup group : hostGroups) {
            Collection<String> hosts = group.getHostInfo();
            for (String host : hosts) {
              //todo: need to use regular expression to avoid matching a host which is a superset.
              if (propValue.contains(host)) {
                matchedHost = true;
                typeProperties.put(propertyName, propValue.replace(
                    host, "%HOSTGROUP::" + group.getName() + "%"));
                break;
              }
            }
            if (matchedHost) {
              break;
            }
          }
          if (! matchedHost) {
            typeProperties.remove(propertyName);
          }
        }
      }
    }
  }

  /**
   * Update multi host topology configuration properties for blueprint export.
   *
   * @param hostGroups  cluster host groups
   * @param updaters    registered updaters
   */
  private void doMultiHostExportUpdate(Collection<? extends HostGroup> hostGroups,
                                       Map<String, Map<String, PropertyUpdater>> updaters) {

    for (Map.Entry<String, Map<String, PropertyUpdater>> entry : updaters.entrySet()) {
      String type = entry.getKey();
      for (String propertyName : entry.getValue().keySet()) {
        Map<String, String> typeProperties = properties.get(type);
        if (typeProperties != null && typeProperties.containsKey(propertyName)) {
          String propValue = typeProperties.get(propertyName);
          for (HostGroup group : hostGroups) {
            Collection<String> hosts = group.getHostInfo();
            for (String host : hosts) {
              propValue = propValue.replaceAll(host + "\\b", "%HOSTGROUP::" + group.getName() + "%");
            }
          }
          Collection<String> addedGroups = new HashSet<String>();
          String[] toks = propValue.split(",");
          boolean inBrackets = propValue.startsWith("[");

          StringBuilder sb = new StringBuilder();
          if (inBrackets) {
            sb.append('[');
          }
          boolean firstTok = true;
          for (String tok : toks) {
            tok = tok.replaceAll("[\\[\\]]", "");

            if (addedGroups.add(tok)) {
              if (! firstTok) {
                sb.append(',');
              }
              sb.append(tok);
            }
            firstTok = false;
          }

          if (inBrackets) {
            sb.append(']');
          }
          typeProperties.put(propertyName, sb.toString());
        }
      }
    }
  }

  /**
   * Get host groups which contain a component.
   *
   * @param component   component name
   * @param hostGroups  collection of host groups to check
   *
   * @return collection of host groups which contain the specified component
   */
  private static Collection<HostGroup> getHostGroupsForComponent(String component,
                                                                 Collection<? extends HostGroup> hostGroups) {

    Collection<HostGroup> resultGroups = new HashSet<HostGroup>();
    for (HostGroup group : hostGroups ) {
      if (group.getComponents().contains(component)) {
        resultGroups.add(group);
      }
    }
    return resultGroups;
  }

  /**
   * Convert a property value which includes a host group topology token to a physical host.
   *
   * @param hostGroups  cluster host groups
   * @param val         value to be converted
   *
   * @return updated value with physical host name
   */
  private static Collection<String> getHostStrings(Map<String, ? extends HostGroup> hostGroups,
                                                   String val) {

    Collection<String> hosts = new HashSet<String>();
    Matcher m = HOSTGROUP_PORT_REGEX.matcher(val);
    while (m.find()) {
      String groupName = m.group(1);
      String port = m.group(2);


      HostGroup hostGroup = hostGroups.get(groupName);
      if (hostGroup == null) {
        throw new IllegalArgumentException(
            "Unable to match blueprint host group token to a host group: " + groupName);
      }
      for (String host : hostGroup.getHostInfo()) {
        if (port != null) {
          host += ":" + port;
        }
        hosts.add(host);
      }
    }
    return hosts;
  }


  /**
   * Provides package-level access to the map of single host topology updaters.
   * This is useful for facilitating unit-testing of this class.
   *
   * @return the map of single host topology updaters
   */
  static Map<String, Map<String, PropertyUpdater>> getSingleHostTopologyUpdaters() {
    return singleHostTopologyUpdaters;
  }

  /**
   * Provides functionality to update a property value.
   */
  public interface PropertyUpdater {
    /**
     * Update a property value.
     *
     *
     * @param hostGroups  host groups
     * @param origValue   original value of property
     * @param properties  all properties
     *
     * @return new property value
     */
    public String updateForClusterCreate(Map<String, ? extends HostGroup> hostGroups,
                                         String origValue, Map<String, Map<String, String>> properties);
  }

  /**
   * Topology based updater which replaces the original host name of a property with the host name
   * which runs the associated (master) component in the new cluster.
   */
  static class SingleHostTopologyUpdater implements PropertyUpdater {
    /**
     * Component name
     */
    private String component;

    /**
     * Constructor.
     *
     * @param component  component name associated with the property
     */
    public SingleHostTopologyUpdater(String component) {
      this.component = component;
    }

    /**
     * Update the property with the new host name which runs the associated component.
     *
     *
     * @param hostGroups  host groups
     * @param origValue   original value of property
     * @param properties  all properties
     *
     * @return updated property value with old host name replaced by new host name
     */
    public String updateForClusterCreate(Map<String, ? extends HostGroup> hostGroups,
                                         String origValue,
                                         Map<String, Map<String, String>> properties)  {

      Matcher m = HOSTGROUP_REGEX.matcher(origValue);
      if (m.find()) {
        String hostGroupName = m.group(1);
        HostGroup hostGroup = hostGroups.get(hostGroupName);
        //todo: ensure > 0 hosts (is this necessary)
        return origValue.replace(m.group(0), hostGroup.getHostInfo().iterator().next());
      } else {
        Collection<HostGroup> matchingGroups = getHostGroupsForComponent(component, hostGroups.values());
        if (matchingGroups.size() == 1) {
          return origValue.replace("localhost", matchingGroups.iterator().next().getHostInfo().iterator().next());
        } else {
          throw new IllegalArgumentException("Unable to update configuration property with topology information. " +
              "Component '" + this.component + "' is not mapped to any host group or is mapped to multiple groups.");
        }
      }
    }

    /**
     * Provides access to the name of the component associated
     *   with this updater instance.
     *
     * @return component name for this updater
     */
    public String getComponentName() {
      return this.component;
    }
  }

  /**
   * Topology based updater which replaces the original host name of a database property with the host name
   * where the DB is deployed in the new cluster.  If an existing database is specified, the original property
   * value is returned.
   */
  private static class DBTopologyUpdater extends SingleHostTopologyUpdater {
    /**
     * Property type (global, core-site ...) for property which is used to determine if DB is external.
     */
    private final String configPropertyType;

    /**
     * Name of property which is used to determine if DB is new or existing (exernal).
     */
    private final String conditionalPropertyName;

    /**
     * Constructor.
     *
     * @param component                component to get hot name if new DB
     * @param conditionalPropertyType  config type of property used to determine if DB is external
     * @param conditionalPropertyName  name of property which is used to determine if DB is external
     */
    private DBTopologyUpdater(String component, String conditionalPropertyType,
                              String conditionalPropertyName) {
      super(component);
      this.configPropertyType = conditionalPropertyType;
      this.conditionalPropertyName = conditionalPropertyName;
    }

    /**
     * If database is a new managed database, update the property with the new host name which
     * runs the associated component.  If the database is external (non-managed), return the
     * original value.
     *
     *
     * @param hostGroups  host groups
     * @param origValue   original value of property
     * @param properties  all properties
     *
     * @return updated property value with old host name replaced by new host name or original value
     *         if the database is external
     */
    @Override
    public String updateForClusterCreate(Map<String, ? extends HostGroup> hostGroups,
                                         String origValue, Map<String, Map<String, String>> properties) {

      if (isDatabaseManaged(properties)) {
        return super.updateForClusterCreate(hostGroups, origValue, properties);
      } else {
        return origValue;
      }
    }

    /**
     * Determine if database is managed, meaning that it is a component in the cluster topology.
     *
     * @return true if the DB is managed; false otherwise
     */
    private boolean isDatabaseManaged(Map<String, Map<String, String>> properties) {
      // conditional property should always exist since it is required to be specified in the stack
      return properties.get(configPropertyType).
          get(conditionalPropertyName).startsWith("New");
    }
  }

  /**
   * Topology based updater which replaces original host names (possibly more than one) contained in a property
   * value with the host names which runs the associated component in the new cluster.
   */
  private static class MultipleHostTopologyUpdater implements PropertyUpdater {
    /**
     * Component name
     */
    private String component;

    /**
     * Separator for multiple property values
     */
    private Character separator = ',';

    /**
     * Constructor.
     *
     * @param component  component name associated with the property
     */
    public MultipleHostTopologyUpdater(String component) {
      this.component = component;
    }

    /**
     * Update all host names included in the original property value with new host names which run the associated
     * component.
     *
     *
     * @param hostGroups  host groups
     * @param origValue   original value of property
     * @param properties  all properties
     *
     * @return updated property value with old host names replaced by new host names
     */
    public String updateForClusterCreate(Map<String, ? extends HostGroup> hostGroups,
                                         String origValue,
                                         Map<String, Map<String, String>> properties) {

      Collection<String> hostStrings = getHostStrings(hostGroups, origValue);
      if (hostStrings.isEmpty()) {
        //default non-exported original value
        String port = null;
        if (origValue.contains(":")) {
          //todo: currently assuming all hosts are using same port
          port = origValue.substring(origValue.indexOf(":") + 1);
        }
        Collection<HostGroup> matchingGroups = getHostGroupsForComponent(component, hostGroups.values());
        for (HostGroup group : matchingGroups) {
          for (String host : group.getHostInfo()) {
            if (port != null) {
              host += ":" + port;
            }
            hostStrings.add(host);
          }
        }
      }

      StringBuilder sb = new StringBuilder();
      boolean firstHost = true;
      for (String host : hostStrings) {
        if (!firstHost) {
          sb.append(separator);
        } else {
          firstHost = false;
        }
        sb.append(host);
      }

      return sb.toString();
    }
  }

  /**
   * Updater which appends "m" to the original property value.
   * For example, "1024" would be updated to "1024m".
   */
  private static class MPropertyUpdater implements PropertyUpdater {
    /**
     * Append 'm' to the original property value if it doesn't already exist.
     *
     *
     * @param hostGroups  host groups
     * @param origValue   original value of property
     * @param properties  all properties
     *
     * @return property with 'm' appended
     */
    public String updateForClusterCreate(Map<String, ? extends HostGroup> hostGroups,
                                         String origValue, Map<String,
        Map<String, String>> properties) {

      return origValue.endsWith("m") ? origValue : origValue + 'm';
    }
  }

  /**
   * Class to facilitate special formatting needs of property values.
   */
  private abstract static class AbstractPropertyValueDecorator implements PropertyUpdater {
    PropertyUpdater propertyUpdater;

    /**
     * Constructor.
     *
     * @param propertyUpdater  wrapped updater
     */
    public AbstractPropertyValueDecorator(PropertyUpdater propertyUpdater) {
      this.propertyUpdater = propertyUpdater;
    }

    /**
     * Return decorated form of the updated input property value.
     *
     * @param hostGroupMap  map of host group name to HostGroup
     * @param origValue     original value of property
     * @param properties    all properties
     *
     * @return Formatted output string
     */
    @Override
    public String updateForClusterCreate(Map<String, ? extends HostGroup> hostGroupMap,
                                         String origValue,
                                         Map<String, Map<String, String>> properties) {

      return doFormat(propertyUpdater.updateForClusterCreate(hostGroupMap, origValue, properties));
    }

    /**
     * Transform input string to required output format.
     *
     * @param originalValue  original value of property
     *
     * @return formatted output string
     */
    public abstract String doFormat(String originalValue);
  }

  /**
   * Return properties of the form ['value']
   */
  private static class YamlMultiValuePropertyDecorator extends AbstractPropertyValueDecorator {

    public YamlMultiValuePropertyDecorator(PropertyUpdater propertyUpdater) {
      super(propertyUpdater);
    }

    /**
     * Format input String of the form, str1,str2 to ['str1','str2']
     *
     * @param origValue  input string
     *
     * @return formatted string
     */
    @Override
    public String doFormat(String origValue) {
      StringBuilder sb = new StringBuilder();
      if (origValue != null) {
        sb.append("[");
        boolean isFirst = true;
        for (String value : origValue.split(",")) {
          if (!isFirst) {
            sb.append(",");
          } else {
            isFirst = false;
          }
          sb.append("'");
          sb.append(value);
          sb.append("'");
        }
        sb.append("]");
      }
      return sb.toString();
    }
  }

  /**
   * Register updaters for configuration properties.
   */
  static {

    allUpdaters.add(singleHostTopologyUpdaters);
    allUpdaters.add(multiHostTopologyUpdaters);
    allUpdaters.add(dbHostTopologyUpdaters);
    allUpdaters.add(mPropertyUpdaters);

    Map<String, PropertyUpdater> hdfsSiteMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> mapredSiteMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> coreSiteMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> hbaseSiteMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> yarnSiteMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> hiveSiteMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> oozieSiteMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> stormSiteMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> falconStartupPropertiesMap = new HashMap<String, PropertyUpdater>();


    Map<String, PropertyUpdater> mapredEnvMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> hadoopEnvMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> hbaseEnvMap = new HashMap<String, PropertyUpdater>();

    Map<String, PropertyUpdater> multiWebhcatSiteMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> multiHbaseSiteMap = new HashMap<String, PropertyUpdater>();
    Map<String, PropertyUpdater> multiStormSiteMap = new HashMap<String, PropertyUpdater>();

    Map<String, PropertyUpdater> dbHiveSiteMap = new HashMap<String, PropertyUpdater>();


    singleHostTopologyUpdaters.put("hdfs-site", hdfsSiteMap);
    singleHostTopologyUpdaters.put("mapred-site", mapredSiteMap);
    singleHostTopologyUpdaters.put("core-site", coreSiteMap);
    singleHostTopologyUpdaters.put("hbase-site", hbaseSiteMap);
    singleHostTopologyUpdaters.put("yarn-site", yarnSiteMap);
    singleHostTopologyUpdaters.put("hive-site", hiveSiteMap);
    singleHostTopologyUpdaters.put("oozie-site", oozieSiteMap);
    singleHostTopologyUpdaters.put("storm-site", stormSiteMap);
    singleHostTopologyUpdaters.put("falcon-startup.properties", falconStartupPropertiesMap);

    mPropertyUpdaters.put("hadoop-env", hadoopEnvMap);
    mPropertyUpdaters.put("hbase-env", hbaseEnvMap);
    mPropertyUpdaters.put("mapred-env", mapredEnvMap);

    multiHostTopologyUpdaters.put("webhcat-site", multiWebhcatSiteMap);
    multiHostTopologyUpdaters.put("hbase-site", multiHbaseSiteMap);
    multiHostTopologyUpdaters.put("storm-site", multiStormSiteMap);

    dbHostTopologyUpdaters.put("hive-site", dbHiveSiteMap);

    // NAMENODE
    hdfsSiteMap.put("dfs.http.address", new SingleHostTopologyUpdater("NAMENODE"));
    hdfsSiteMap.put("dfs.https.address", new SingleHostTopologyUpdater("NAMENODE"));
    coreSiteMap.put("fs.default.name", new SingleHostTopologyUpdater("NAMENODE"));
    hdfsSiteMap.put("dfs.namenode.http-address", new SingleHostTopologyUpdater("NAMENODE"));
    hdfsSiteMap.put("dfs.namenode.https-address", new SingleHostTopologyUpdater("NAMENODE"));
    coreSiteMap.put("fs.defaultFS", new SingleHostTopologyUpdater("NAMENODE"));
    hbaseSiteMap.put("hbase.rootdir", new SingleHostTopologyUpdater("NAMENODE"));

    // SECONDARY_NAMENODE
    hdfsSiteMap.put("dfs.secondary.http.address", new SingleHostTopologyUpdater("SECONDARY_NAMENODE"));
    hdfsSiteMap.put("dfs.namenode.secondary.http-address", new SingleHostTopologyUpdater("SECONDARY_NAMENODE"));

    // JOBTRACKER
    mapredSiteMap.put("mapred.job.tracker", new SingleHostTopologyUpdater("JOBTRACKER"));
    mapredSiteMap.put("mapred.job.tracker.http.address", new SingleHostTopologyUpdater("JOBTRACKER"));
    mapredSiteMap.put("mapreduce.history.server.http.address", new SingleHostTopologyUpdater("JOBTRACKER"));


    // HISTORY_SERVER
    yarnSiteMap.put("yarn.log.server.url", new SingleHostTopologyUpdater("HISTORYSERVER"));
    mapredSiteMap.put("mapreduce.jobhistory.webapp.address", new SingleHostTopologyUpdater("HISTORYSERVER"));
    mapredSiteMap.put("mapreduce.jobhistory.address", new SingleHostTopologyUpdater("HISTORYSERVER"));

    // RESOURCEMANAGER
    yarnSiteMap.put("yarn.resourcemanager.hostname", new SingleHostTopologyUpdater("RESOURCEMANAGER"));
    yarnSiteMap.put("yarn.resourcemanager.resource-tracker.address", new SingleHostTopologyUpdater("RESOURCEMANAGER"));
    yarnSiteMap.put("yarn.resourcemanager.webapp.address", new SingleHostTopologyUpdater("RESOURCEMANAGER"));
    yarnSiteMap.put("yarn.resourcemanager.scheduler.address", new SingleHostTopologyUpdater("RESOURCEMANAGER"));
    yarnSiteMap.put("yarn.resourcemanager.address", new SingleHostTopologyUpdater("RESOURCEMANAGER"));
    yarnSiteMap.put("yarn.resourcemanager.admin.address", new SingleHostTopologyUpdater("RESOURCEMANAGER"));

    // HIVE_SERVER
    hiveSiteMap.put("hive.metastore.uris", new SingleHostTopologyUpdater("HIVE_SERVER"));
    dbHiveSiteMap.put("javax.jdo.option.ConnectionURL",
        new DBTopologyUpdater("MYSQL_SERVER", "hive-env", "hive_database"));

    // OOZIE_SERVER
    oozieSiteMap.put("oozie.base.url", new SingleHostTopologyUpdater("OOZIE_SERVER"));

    // ZOOKEEPER_SERVER
    multiHbaseSiteMap.put("hbase.zookeeper.quorum", new MultipleHostTopologyUpdater("ZOOKEEPER_SERVER"));
    multiWebhcatSiteMap.put("templeton.zookeeper.hosts", new MultipleHostTopologyUpdater("ZOOKEEPER_SERVER"));

    // STORM
    stormSiteMap.put("nimbus.host", new SingleHostTopologyUpdater("NIMBUS"));
    stormSiteMap.put("worker.childopts", new SingleHostTopologyUpdater("GANGLIA_SERVER"));
    stormSiteMap.put("supervisor.childopts", new SingleHostTopologyUpdater("GANGLIA_SERVER"));
    stormSiteMap.put("nimbus.childopts", new SingleHostTopologyUpdater("GANGLIA_SERVER"));
    multiStormSiteMap.put("storm.zookeeper.servers",
        new YamlMultiValuePropertyDecorator(new MultipleHostTopologyUpdater("ZOOKEEPER_SERVER")));

    // FALCON
    falconStartupPropertiesMap.put("*.broker.url", new SingleHostTopologyUpdater("FALCON_SERVER"));


    // Required due to AMBARI-4933.  These no longer seem to be required as the default values in the stack
    // are now correct but are left here in case an existing blueprint still contains an old value.
    hadoopEnvMap.put("namenode_heapsize", new MPropertyUpdater());
    hadoopEnvMap.put("namenode_opt_newsize", new MPropertyUpdater());
    hadoopEnvMap.put("namenode_opt_maxnewsize", new MPropertyUpdater());
    hadoopEnvMap.put("dtnode_heapsize", new MPropertyUpdater());
    mapredEnvMap.put("jtnode_opt_newsize", new MPropertyUpdater());
    mapredEnvMap.put("jtnode_opt_maxnewsize", new MPropertyUpdater());
    mapredEnvMap.put("jtnode_heapsize", new MPropertyUpdater());
    hbaseEnvMap.put("hbase_master_heapsize", new MPropertyUpdater());
    hbaseEnvMap.put("hbase_regionserver_heapsize", new MPropertyUpdater());
  }
}
