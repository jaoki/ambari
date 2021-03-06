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

App = require('app');
require('ember');
require('models/host_component');
require('views/common/modal_popup');
require('mixins/common/userPref');
require('controllers/application');
require('controllers/global/background_operations_controller');
require('controllers/global/cluster_controller');
require('controllers/main/service/reassign_controller');
require('controllers/main/service/item');
var batchUtils = require('utils/batch_scheduled_requests');
var testHelpers = require('test/helpers');

describe('App.MainServiceItemController', function () {

  describe('#setStartStopState', function () {
    var tests = [
      {
        serviceController: {
          serviceName: "YARN"
        },
        backgroundOperationsController: {
          services: [
            {
              isRunning: true,
              dependentService: "ALL_SERVICES"
            }
          ]
        },
        isPending: true,
        m: 'operaion is active because all services are running'
      },
      {
        serviceController: {
          serviceName: "HBASE"
        },
        backgroundOperationsController: {
          services: [
            {
              isRunning: true,
              dependentService: "HBASE"
            }
          ]
        },
        isPending: true,
        m: 'operaion is active button because current service is running'
      },
      {
        serviceController: {
          serviceName: "HDFS"
        },
        backgroundOperationsController: {
          services: [

          ]
        },
        isPending: true,
        m: 'pending is true - backgroundOperationsController.services is empty'
      },
      {
        serviceController: {
          serviceName: "HBASE"
        },
        backgroundOperationsController: {
          services: [
            {
              isRunning: false,
              dependentService: "ALL_SERVICES"
            }
          ]
        },
        isPending: false,
        m: 'pending is false - operation is not running'
      },
      {
        serviceController: {
          serviceName: "HBASE"
        },
        backgroundOperationsController: {
          services: [
            {
              isRunning: true,
              dependentService: "HDFS"
            }
          ]
        },
        isPending: false,
        m: 'pending is false - current service is not running'
      }
    ];

    tests.forEach(function (test) {
      describe(test.m, function () {

        var mainServiceItemController;

        beforeEach(function () {
          sinon.stub(App.router, 'get', function(k) {
            if ('backgroundOperationsController.services' === k) return test.backgroundOperationsController.services;
            return Em.get(App.router, k);
          });
          mainServiceItemController = App.MainServiceItemController.create({content: {serviceName: test.serviceController.serviceName}});
          mainServiceItemController.setStartStopState();
        });

        afterEach(function () {
          App.router.get.restore();
        });

        it('isPending is ' + test.isPending, function () {
          expect(mainServiceItemController.get('isPending')).to.equal(test.isPending);
        });

      });
    })
  });

  describe('#reassignMaster()', function () {
    var tests = [
      {
        host_components: [
          {componentName: "RESOURCEMANGER"}
        ],
        componentName: "RESOURCEMANGER",
        result: true,
        m: 'run reassignMaster'
      },
      {
        host_components: [
          {componentName: "RESOURCEMANGER"}
        ],
        componentName: "DATANODE",
        result: false,
        m: 'don\t run reassignMaster'
      }
    ];

    tests.forEach(function (test) {
      describe(test.m, function () {

        var reassignMasterController = App.ReassignMasterController.create({currentStep: ''});

        beforeEach(function () {
          sinon.stub(reassignMasterController, 'saveComponentToReassign', Em.K);
          sinon.stub(reassignMasterController, 'setCurrentStep', Em.K);
          sinon.stub(App.router, 'transitionTo', Em.K);
          var mainServiceItemController = App.MainServiceItemController.create({});
          sinon.stub(App.HostComponent, 'find', function() {
            return test.host_components
          });
          sinon.stub(App.router, 'get', function(k) {
            if ('reassignMasterController' === k) return reassignMasterController;
            return Em.get(App.router, k);
          });
          mainServiceItemController.reassignMaster(test.componentName);
        });

        afterEach(function () {
          reassignMasterController.saveComponentToReassign.restore();
          reassignMasterController.setCurrentStep.restore();
          App.HostComponent.find.restore();
          App.router.transitionTo.restore();
          App.router.get.restore();
        });

        it('saveComponentToReassign is ' + (test.result ? '' : 'not') + ' called once', function () {
          expect(reassignMasterController.saveComponentToReassign.calledOnce).to.equal(test.result);
        });

        it('setCurrentStep is ' + (test.result ? '' : 'not') + ' called once', function () {
          expect(reassignMasterController.setCurrentStep.calledOnce).to.equal(test.result);
        });

      });
    }, this);
  });

  describe("#doAction", function () {

    var el = document.createElement("BUTTON");
    el.disabled = false;
    var tests = [
      {
        event: {
          target: el,
          context: {
            action: 'runSmokeTest'
          }
        },
        m: "run runSmokeTest"
      },
      {
        event: {
          target: el,
          context: {
            action: 'refreshConfigs'
          }
        },
        m: "run refreshConfigs"
      },
      {
        event: {
          target: el,
          context: {
            action: 'restartAllHostComponents'
          }
        },
        m: "run restartAllHostComponents"
      },
      {
        event: {
          target: el,
          context: {
            action: 'rollingRestart'
          }
        },
        m: "run rollingRestart"
      }
    ];

    tests.forEach(function (test) {
      var mainServiceItemController = App.MainServiceItemController.create({});
      mainServiceItemController.set(test.event.context.action, Em.K);
      beforeEach(function () {
        sinon.spy(mainServiceItemController, test.event.context.action);
      });
      afterEach(function () {
        mainServiceItemController[test.event.context.action].restore();
      });
      it(test.m, function () {
        mainServiceItemController.doAction(test.event);
        expect(mainServiceItemController[test.event.context.action].calledOnce).to.equal(!test.event.target.disabled);
      });
    });
  });

  describe("#startService , #stopService", function () {
    var mainServiceItemController = App.MainServiceItemController.create({startStopPopup: Em.K});
    beforeEach(function () {
      sinon.spy(mainServiceItemController, "startStopPopup");
    });
    afterEach(function () {
      mainServiceItemController.startStopPopup.restore();
    });
    it("start service", function () {
      mainServiceItemController.startService({});
      expect(mainServiceItemController.startStopPopup.calledWith({},App.HostComponentStatus.started)).to.equal(true);
    });
    it("stop service", function () {
      mainServiceItemController.stopService({});
      expect(mainServiceItemController.startStopPopup.calledWith({},App.HostComponentStatus.stopped)).to.equal(true);
    });
  });

  describe("#turnOnOffPassive", function () {
    var mainServiceItemController = App.MainServiceItemController.create({turnOnOffPassiveRequest: Em.K});
    beforeEach(function () {
      sinon.spy(batchUtils, "turnOnOffPassiveRequest");
      mainServiceItemController.set('content', {serviceName: ''});
    });
    afterEach(function () {
      batchUtils.turnOnOffPassiveRequest.restore();
    });
    it("turns on/off passive mode for service", function () {
      mainServiceItemController.turnOnOffPassive({}).onPrimary();
      expect(batchUtils.turnOnOffPassiveRequest.calledOnce).to.equal(true);
    });
  });

  describe("#runSmokeTest", function () {
    var tests = [
      {
        content: {
          id: "YARN",
          service_name: "YARN",
          work_status: "STARTED"
        },
        startSmoke: true,
        serviceName: "MAPREDUCE2",
        m: "don't run smoke test primary for MAPREDUCE2"
      },
      {
        content: {
          id: "YARN",
          service_name: "YARN",
          work_status: "STOPPED"
        },
        startSmoke: false,
        serviceName: "MAPREDUCE2",
        m: "run smoke test primary for MAPREDUCE2"
      },
      {
        m: "run smoke test primary for all services (not MAPREDUCE2)",
        startSmoke: true,
        default: true
      }
    ];

    tests.forEach(function (test) {
      var mainServiceItemController = test.default ? App.MainServiceItemController.create({runSmokeTestPrimary: Em.K}) :
        App.MainServiceItemController.create({content: {serviceName: test.serviceName}, runSmokeTestPrimary: Em.K});
      beforeEach(function () {
        sinon.spy(mainServiceItemController, "runSmokeTestPrimary");
      });
      afterEach(function () {
        mainServiceItemController.runSmokeTestPrimary.restore();
      });
      it(test.m, function () {
        if (!test.default) {
          App.store.load(App.Service, test.content);
        }
        mainServiceItemController.runSmokeTest({}).onPrimary();
        expect(mainServiceItemController.runSmokeTestPrimary.calledOnce).to.equal(test.startSmoke);
      });
    });
  });

  describe("#startStopPopup", function () {
    var el = document.createElement("BUTTON");
    el.disabled = false;
    var event = {
      target: el
    };
    var mainServiceItemController = App.MainServiceItemController.create({
      content: {
        serviceName: "HDFS",
        hostComponents: [ {
          componentName: 'NAMENODE',
          workStatus: 'INSTALLED'
        }]
      }
    });
    var mainServiceItemControllerHdfsStarted = App.MainServiceItemController.create({
      content: {
        serviceName: "HDFS",
        hostComponents: [ {
          componentName: 'NAMENODE',
          workStatus: 'STARTED'
        }]
      }
    });
    beforeEach(function () {
      sinon.spy(mainServiceItemController, "startStopPopupPrimary");
      sinon.spy(mainServiceItemControllerHdfsStarted, "startStopPopupPrimary");
      sinon.spy(Em.I18n, "t");
      sinon.stub(mainServiceItemControllerHdfsStarted, 'checkNnLastCheckpointTime', function(callback) {
        return callback;
      });
    });
    afterEach(function () {
      mainServiceItemController.startStopPopupPrimary.restore();
      mainServiceItemControllerHdfsStarted.startStopPopupPrimary.restore();
      mainServiceItemControllerHdfsStarted.checkNnLastCheckpointTime.restore();
      Em.I18n.t.restore();
    });
    it("start start/stop service popup", function () {
      mainServiceItemController.startStopPopup(event, "").onPrimary();
      expect(mainServiceItemController.startStopPopupPrimary.calledOnce).to.equal(true);
    });

    it ("should popup warning to check last checkpoint time if work status is STARTED", function() {
      mainServiceItemControllerHdfsStarted.startStopPopup(event, "INSTALLED");
      expect(mainServiceItemControllerHdfsStarted.checkNnLastCheckpointTime.calledOnce).to.equal(true);
    });

    describe("modal messages", function() {
      
      beforeEach(function () {
        sinon.stub(App.StackService, 'find').returns([
          Em.Object.create({
            serviceName: 'HDFS',
            displayName: 'HDFS',
            isInstalled: true,
            isSelected: true,
            requiredServices:["ZOOKEEPER"] 
          }),
          Em.Object.create({
            serviceName: 'HIVE',
            displayName: 'Hive',
            isInstalled: true,
            isSelected: true
          }),
          Em.Object.create({
            serviceName: 'HBASE',
            displayName: 'HBase',
            isInstalled: true,
            isSelected: true,
            requiredServices:["HDFS", "ZOOKEEPER"]
          }),
          Em.Object.create({
            serviceName: 'YARN',
            displayName: 'YARN',
            isInstalled: true,
            isSelected: true,
            requiredServices:["HDFS"]
          }),
          Em.Object.create({
            serviceName: 'SPARK',
            displayName: 'Spark',
            isInstalled: true,
            isSelected: true,
            requiredServices:["HIVE"]
          })
        ]);
      });
      
      it ("should confirm stop if serviceHealth is INSTALLED", function() {
        mainServiceItemController.startStopPopup(event, "INSTALLED");
        expect(Em.I18n.t.calledWith('services.service.stop.confirmMsg')).to.be.ok;
        expect(Em.I18n.t.calledWith('services.service.stop.confirmButton')).to.be.ok;
      });

      it ("should confirm start if serviceHealth is not INSTALLED", function() {
        mainServiceItemController.startStopPopup(event, "");
        expect(Em.I18n.t.calledWith('services.service.start.confirmMsg')).to.be.ok;
        expect(Em.I18n.t.calledWith('services.service.start.confirmButton')).to.be.ok;
      });
      
      it ("should not display a dependent list if it is to start a service", function() {
        var _mainServiceItemController = App.MainServiceItemController.create(
            {content: {serviceName: "HDFS", passiveState:'OFF'}});
        _mainServiceItemController.startStopPopup(event, "");
        expect(Em.I18n.t.calledWith('services.service.stop.warningMsg.dependent.services')).to.not.be.ok;
      });
      
      describe ("should display dependent list if other services depend on the one to be stopped", function() {
        beforeEach(function () {
          var _mainServiceItemController = App.MainServiceItemController.create(
            {content: {
              serviceName: "HDFS",
              passiveState:'OFF',
              hostComponents: [{
                componentName: 'NAMENODE',
                workStatus: 'INSTALLED'
              }]
            }}
          );
          _mainServiceItemController.startStopPopup(event, "INSTALLED");
          this.dependencies = Em.I18n.t('services.service.stop.warningMsg.dependent.services').format("HDFS", "HBase,YARN");
          this.msg = Em.I18n.t('services.service.stop.warningMsg.turnOnMM').format("HDFS");
          this.fullMsg = _mainServiceItemController.addAdditionalWarningMessage("INSTALLED", this.msg, "HDFS");
        });

        it('turnOnMM message is shown', function () {
          expect(Em.I18n.t.calledWith('services.service.stop.warningMsg.turnOnMM')).to.be.ok;
        });
        it('message about dependent services is shown', function () {
          expect(Em.I18n.t.calledWith('services.service.stop.warningMsg.dependent.services')).to.be.ok;
        });
        it('full message is valid', function () {
          expect(this.fullMsg).to.be.equal(this.msg + " " + this.dependencies);
        });
      });

      describe("should display the dependent service if another service depends on the one to be stopped", function() {

        beforeEach(function () {
          var _mainServiceItemController = App.MainServiceItemController.create(
            {content: {serviceName: "HIVE", passiveState:'OFF'}});
          _mainServiceItemController.startStopPopup(event, "INSTALLED");
          this.dependencies = Em.I18n.t('services.service.stop.warningMsg.dependent.services').format("HIVE", "Spark");
          this.msg = Em.I18n.t('services.service.stop.warningMsg.turnOnMM').format("HIVE");
          this.fullMsg = _mainServiceItemController.addAdditionalWarningMessage("INSTALLED", this.msg, "HIVE");
        });

        it('message about dependent services is shown', function () {
          expect(Em.I18n.t.calledWith('services.service.stop.warningMsg.dependent.services')).to.be.ok;
        });
        it('full message is valid', function () {
          expect(this.fullMsg).to.be.equal(this.msg + " " + this.dependencies);
        });
      });
      
      afterEach(function () {
        App.StackService.find.restore();
      });
    });
  });

  describe("#restartAllHostComponents", function () {
    var temp = batchUtils.restartAllServiceHostComponents;
    var mainServiceItemController = App.MainServiceItemController.create({
      content: {
        serviceName: "HDFS",
        hostComponents: [{
          componentName: 'NAMENODE',
          workStatus: 'STARTED'
        }]
      }
    });
    beforeEach(function () {
      batchUtils.restartAllServiceHostComponents = Em.K;
      sinon.spy(batchUtils, "restartAllServiceHostComponents");
      sinon.stub(App.Service, 'find', function() {
        return Em.Object.create({serviceTypes: []});
      });
      sinon.stub(mainServiceItemController, 'checkNnLastCheckpointTime', function() {
        return true;
      });
    });
    afterEach(function () {
      batchUtils.restartAllServiceHostComponents.restore();
      batchUtils.restartAllServiceHostComponents = temp;
      App.Service.find.restore();
      mainServiceItemController.checkNnLastCheckpointTime.restore();
    });

    it("start restartAllHostComponents for service", function () {
      var controller = App.MainServiceItemController.create({
        content: {
          serviceName: "HDFS",
          hostComponents: [{
            componentName: 'NAMENODE',
            workStatus: 'INSTALLED'
          }]
        }
      });
      controller.restartAllHostComponents({}).onPrimary();
      expect(batchUtils.restartAllServiceHostComponents.calledOnce).to.equal(true);
    });

    it("check last checkpoint time for NameNode before start restartAllHostComponents for service", function () {
      mainServiceItemController.restartAllHostComponents({});
      expect(mainServiceItemController.checkNnLastCheckpointTime.calledOnce).to.equal(true);
    });
  });

  describe("#rollingRestart", function () {
    var temp = batchUtils.launchHostComponentRollingRestart;
    beforeEach(function () {
      batchUtils.launchHostComponentRollingRestart = Em.K;
      sinon.spy(batchUtils, "launchHostComponentRollingRestart");
    });
    afterEach(function () {
      batchUtils.launchHostComponentRollingRestart.restore();
      batchUtils.launchHostComponentRollingRestart = temp;
    });

    var mainServiceItemController = App.MainServiceItemController.create();

    it("start restartAllHostComponents for service", function () {
      mainServiceItemController.rollingRestart();
      expect(batchUtils.launchHostComponentRollingRestart.calledOnce).to.equal(true);
    });
  });

  describe("#parseNnCheckPointTime", function () {
    var tests = [
      {
        m: "NameNode has JMX data, the last checkpoint time is less than 12 hours ago",
        data:
        {"href" : "",
          "ServiceComponentInfo" : {
            "cluster_name" : "c123",
            "component_name" : "NAMENODE",
            "service_name" : "HDFS"
          },
          "host_components" : [
            {
              "href" : "",
              "HostRoles" : {
                "cluster_name" : "c123",
                "component_name" : "NAMENODE",
                "host_name" : "c6401.ambari.apache.org"
              },
              "metrics" : {
                "dfs" : {
                  "FSNamesystem" : {
                    "HAState" : "active",
                    "LastCheckpointTime" : 1435775648000
                  }
                }
              }
            }
          ]
        },
        result: false
      },
      {
        m: "NameNode has JMX data, the last checkpoint time is > 12 hours ago",
        data:
          {"href" : "",
            "ServiceComponentInfo" : {
              "cluster_name" : "c123",
              "component_name" : "NAMENODE",
              "service_name" : "HDFS"
            },
            "host_components" : [
              {
                "href" : "",
                "HostRoles" : {
                  "cluster_name" : "c123",
                  "component_name" : "NAMENODE",
                  "host_name" : "c6401.ambari.apache.org"
                },
                "metrics" : {
                  "dfs" : {
                    "FSNamesystem" : {
                      "HAState" : "active",
                      "LastCheckpointTime" : 1435617248000
                    }
                  }
                }
              }
            ]
          },
        result: "c6401.ambari.apache.org"
      },
      {
        m: "NameNode has no JMX data available",
        data:
        {"href" : "",
          "ServiceComponentInfo" : {
            "cluster_name" : "c123",
            "component_name" : "NAMENODE",
            "service_name" : "HDFS"
          },
          "host_components" : [
            {
              "href" : "",
              "HostRoles" : {
                "cluster_name" : "c123",
                "component_name" : "NAMENODE",
                "host_name" : "c6401.ambari.apache.org"
              },
              "metrics" : {
                "dfs" : {
                  "FSNamesystem" : {
                    "HAState" : "active"
                  }
                }
              }
            }
          ]
        },
        result: null
      },
      {
        m: "HA enabled, both active and standby NN has JMX data normally.",
        data:
        {"href" : "",
          "ServiceComponentInfo" : {
            "cluster_name" : "c123",
            "component_name" : "NAMENODE",
            "service_name" : "HDFS"
          },
          "host_components" : [
            {
              "href" : "",
              "HostRoles" : {
                "cluster_name" : "c123",
                "component_name" : "NAMENODE",
                "host_name" : "c6401.ambari.apache.org"
              },
              "metrics" : {
                "dfs" : {
                  "FSNamesystem" : {
                    "HAState" : "active",
                    "LastCheckpointTime" : 1435775648000
                  }
                }
              }
            },
            {
              "href" : "",
              "HostRoles" : {
                "cluster_name" : "c123",
                "component_name" : "NAMENODE",
                "host_name" : "c6402.ambari.apache.org"
              },
              "metrics" : {
                "dfs" : {
                  "FSNamesystem" : {
                    "HAState" : "standby",
                    "LastCheckpointTime" : 1435775648000
                  }
                }
              }
            }
          ]
        },
        result: false
      },
      {
        m: "HA enabled, both NamoNodes are standby NN",
        data:
        {"href" : "",
          "ServiceComponentInfo" : {
            "cluster_name" : "c123",
            "component_name" : "NAMENODE",
            "service_name" : "HDFS"
          },
          "host_components" : [
            {
              "href" : "",
              "HostRoles" : {
                "cluster_name" : "c123",
                "component_name" : "NAMENODE",
                "host_name" : "c6401.ambari.apache.org"
              },
              "metrics" : {
                "dfs" : {
                  "FSNamesystem" : {
                    "HAState" : "standby",
                    "LastCheckpointTime" : 1435775648000
                  }
                }
              }
            },
            {
              "href" : "",
              "HostRoles" : {
                "cluster_name" : "c123",
                "component_name" : "NAMENODE",
                "host_name" : "c6402.ambari.apache.org"
              },
              "metrics" : {
                "dfs" : {
                  "FSNamesystem" : {
                    "HAState" : "standby",
                    "LastCheckpointTime" : 1435775648000
                  }
                }
              }
            }
          ]
        },
        result: false
      },
      {
        m: "HA enabled, active NN has no JMX data, use the standby's data",
        data:
        {"href" : "",
          "ServiceComponentInfo" : {
            "cluster_name" : "c123",
            "component_name" : "NAMENODE",
            "service_name" : "HDFS"
          },
          "host_components" : [
            {
              "href" : "",
              "HostRoles" : {
                "cluster_name" : "c123",
                "component_name" : "NAMENODE",
                "host_name" : "c6401.ambari.apache.org"
              },
              "metrics" : {
                "dfs" : {
                  "FSNamesystem" : {
                    "HAState" : "active"
                  }
                }
              }
            },
            {
              "href" : "",
              "HostRoles" : {
                "cluster_name" : "c123",
                "component_name" : "NAMENODE",
                "host_name" : "c6402.ambari.apache.org"
              },
              "metrics" : {
                "dfs" : {
                  "FSNamesystem" : {
                    "HAState" : "standby",
                    "LastCheckpointTime" : 1435775648000
                  }
                }
              }
            }
          ]
        },
        result: false
      },
      {
        m: "HA enabled, both NamoNodes no JMX data",
        data:
        {"href" : "",
          "ServiceComponentInfo" : {
            "cluster_name" : "c123",
            "component_name" : "NAMENODE",
            "service_name" : "HDFS"
          },
          "host_components" : [
            {
              "href" : "",
              "HostRoles" : {
                "cluster_name" : "c123",
                "component_name" : "NAMENODE",
                "host_name" : "c6401.ambari.apache.org"
              },
              "metrics" : {
                "dfs" : {
                  "FSNamesystem" : {
                    "HAState" : "active"
                  }
                }
              }
            },
            {
              "href" : "",
              "HostRoles" : {
                "cluster_name" : "c123",
                "component_name" : "NAMENODE",
                "host_name" : "c6402.ambari.apache.org"
              },
              "metrics" : {
                "dfs" : {
                  "FSNamesystem" : {
                    "HAState" : "standby"
                  }
                }
              }
            }
          ]
        },
        result: null
      }
    ];

    beforeEach(function () {
      sinon.stub(App, 'dateTime').returns(1435790048000);
    });

    afterEach(function () {
      App.dateTime.restore();
    });

    tests.forEach(function (test) {
      it(test.m, function () {
        var mainServiceItemController = App.MainServiceItemController.create({isNNCheckpointTooOld: null});
        mainServiceItemController.parseNnCheckPointTime(test.data);
        expect(mainServiceItemController.get('isNNCheckpointTooOld')).to.equal(test.result);
      });
    });
  });

  describe("#isStartDisabled", function () {
    var tests = [
      {
        content: {
          healthStatus: 'red'
        },
        isPending: true,
        disabled: true,
        m: "disabled because of pending"
      },
      {
        content: {
          healthStatus: 'green'
        },
        isPending: false,
        disabled: true,
        m: "disabled because healthStatus is not red"
      },
      {
        content: {
          healthStatus: 'red'
        },
        isPending: false,
        disabled: false,
        m: "enabled because healthStatus is red and pending is false"
      }
    ];
    tests.forEach(function (test) {
      it(test.m, function () {
        var mainServiceItemController = App.MainServiceItemController.create({content: {healthStatus: test.content.healthStatus}, isPending: test.isPending});
        expect(mainServiceItemController.get('isStartDisabled')).to.equal(test.disabled);
      });
    });
  });

  describe("#isStopDisabled", function () {
    var tests = [
      {
        content: {
          healthStatus: 'red'
        },
        isPending: true,
        disabled: true,
        m: "disabled because of pending"
      },
      {
        content: {
          healthStatus: 'green'
        },
        isPending: false,
        disabled: false,
        m: "enabled because healthStatus is green and pending is false"
      },
      {
        content: {
          healthStatus: 'red'
        },
        isPending: false,
        disabled: true,
        m: "disabled because healthStatus is not green"
      }
    ];
    tests.forEach(function (test) {
      it(test.m, function () {
        var mainServiceItemController = App.MainServiceItemController.create({content: test.content, isPending: test.isPending});
        expect(mainServiceItemController.get('isStopDisabled')).to.equal(test.disabled);
      });
    });
  });

  describe("#runRebalancer", function () {

    beforeEach(function () {
      sinon.stub(App.router, 'get', function(k) {
        if ('applicationController' === k) {
          return Em.Object.create({
            dataLoading: function() {
              return {done: Em.K}
            }
          });
        }
        return Em.get(App.router, k);
      });
    });

    afterEach(function () {
      App.router.get.restore();
    });

    it("run rebalancer", function () {
      var mainServiceItemController = App.MainServiceItemController.create({content: {runRebalancer: false}});
      mainServiceItemController.runRebalancer().onPrimary();
      expect(mainServiceItemController.get("content.runRebalancer")).to.equal(true);
    });
  });

  describe("#runCompaction", function () {

    beforeEach(function () {
      sinon.stub(App.router, 'get', function(k) {
        if ('applicationController' === k) {
          return Em.Object.create({
            dataLoading: function() {
              return {done: Em.K}
            }
          });
        }
        return Em.get(App.router, k);
      });
    });

    afterEach(function () {
      App.router.get.restore();
    });

    it("run compaction", function () {
      var mainServiceItemController = App.MainServiceItemController.create({content: {runCompaction: false}});
      mainServiceItemController.runCompaction().onPrimary();
      expect(mainServiceItemController.get("content.runCompaction")).to.equal(true);
    });
  });

  describe("#runSmokeTestPrimary", function () {
    beforeEach(function () {
      sinon.stub(App, 'get').withArgs('clusterName').returns('myCluster');
    });

    afterEach(function () {
      App.get.restore();
    });

    var tests = [
      {
        data: {
          'serviceName': "HDFS",
          'displayName': "HDFS",
          'query': "test"
        },
        "RequestInfo": {
          "context": "HDFS Service Check",
          "command" : "HDFS_SERVICE_CHECK"
        },
        "Requests/resource_filters": [{"service_name" : "HDFS"}]
      },
      {
        data: {
          'serviceName': "KERBEROS",
          'displayName': "Kerberos",
          'query': "test"
        },
        "RequestInfo": {
          "context": "Kerberos Service Check",
          "command" : "KERBEROS_SERVICE_CHECK",
          "operation_level": {
            "level": "CLUSTER",
            "cluster_name": "myCluster"
          }
        },
        "Requests/resource_filters": [{"service_name" : "KERBEROS"}]
      }
    ];

    tests.forEach(function (test) {

      var mainServiceItemController = App.MainServiceItemController.create({content: {serviceName: test.data.serviceName,
        displayName: test.data.displayName}});
      describe('send request to run smoke test for ' + test.data.serviceName, function () {

        beforeEach(function () {
          mainServiceItemController.set("runSmokeTestErrorCallBack", Em.K);
          mainServiceItemController.set("runSmokeTestSuccessCallBack", Em.K);
          mainServiceItemController.runSmokeTestPrimary(test.data.query);
          this.args = testHelpers.findAjaxRequest('name', 'service.item.smoke')[0];
          this.data = this.args.data;
          this.data = JSON.parse(App.ajax.fakeGetUrl('service.item.smoke').format(this.data).data);
        });

        it('ajax request is sent', function () {
          expect(this.args).exists;
        });

        it('RequestInfo.context is valid', function () {
          expect(this.data.RequestInfo.context).to.equal(test.RequestInfo.context);
        });

        it('RequestInfo.command is valid', function () {
          expect(this.data.RequestInfo.command).to.equal(test.RequestInfo.command);
        });

        it('Requests/resource_filter.0.serviceName is valid', function () {
          expect(this.data["Requests/resource_filters"][0].serviceName).to.equal(test["Requests/resource_filters"][0].serviceName);
        });

        it('RequestInfo.operation_level is valid', function () {
          expect(this.data.RequestInfo.operation_level).to.be.deep.equal(test.RequestInfo.operation_level);
        });

      });
    });
  });

  describe('#downloadClientConfigs()', function () {

    var mainServiceItemController = App.MainServiceItemController.create({
      content: {
        clientComponents: [
          Em.Object.create({
            totalCount: 1,
            componentName: 'C1',
            displayName: 'd1'
          })
        ],
        serviceName: 'S1'
      }
    });

    beforeEach(function () {
      sinon.stub(mainServiceItemController, 'downloadClientConfigsCall', Em.K);
    });
    afterEach(function () {
      mainServiceItemController.downloadClientConfigsCall.restore();
    });

    it('should launch $.fileDownload method', function () {
      mainServiceItemController.downloadClientConfigs();
      expect(mainServiceItemController.downloadClientConfigsCall.calledWith({
        serviceName: 'S1',
        componentName: 'C1',
        displayName: 'd1'
      })).to.be.true;
    });
    it('should launch $.fileDownload method, event passed', function () {
      var event = {
        label: 'label1',
        name: 'name1'
      };
      mainServiceItemController.downloadClientConfigs(event);
      expect(mainServiceItemController.downloadClientConfigsCall.calledWith({
        serviceName: 'S1',
        componentName: 'name1',
        displayName: 'label1'
      })).to.be.true;
    });
  });

  describe('#startLdapKnox() and #stopLdapKnox() should call startStopLdapKnox once: ', function () {


    var mainServiceItemController = App.MainServiceItemController.create({content: {serviceName: 'KNOX',
      displayName: 'Knox'}});

    beforeEach(function () {
      sinon.stub(mainServiceItemController, 'startStopLdapKnox', function(){
        return true;
      });
    });
    afterEach(function () {
      mainServiceItemController.startStopLdapKnox.restore();
    });

    var tests = [
      {
        methodName: 'startLdapKnox',
        callback: mainServiceItemController.startLdapKnox
      },
      {
        methodName: 'stopLdapKnox',
        callback: mainServiceItemController.stopLdapKnox
      }
    ];

    tests.forEach(function(test){
      it(test.methodName + ' should call startStopLdapKnox method', function () {
        test.callback.call(mainServiceItemController);
        expect(mainServiceItemController.startStopLdapKnox.calledOnce).to.be.true;
      });
    },this);

  });

  describe("#executeCustomCommand", function () {
    var data = {
      data: {
        'serviceName': "SAMPLESRV",
        'displayName': "SAMPLESRV",
        'query': "test"
      },
      "RequestInfo": {
        "context": "Execute Custom Commands",
        "command" : "SAMPLESRVCUSTOMCOMMANDS"
      },
      "Requests/resource_filters": [{"service_name" : "SAMPLESRV"}]
    };

    var context = {
      label: 'Execute Custom Commands',
      service: data.data.serviceName,
      component: data.data.serviceName,
      command: data.RequestInfo.command
    };

    var mainServiceItemController = App.MainServiceItemController.create({
      content: {
        serviceName: data.data.serviceName,
        displayName: data.data.displayName
      }
    });

    before(function () {
      mainServiceItemController.set("executeCustomCommandErrorCallback", Em.K);
      mainServiceItemController.set("executeCustomCommandSuccessCallback", Em.K);
      sinon.spy(App, 'showConfirmationPopup');
    });

    after(function () {
      App.showConfirmationPopup.restore();
    });

    it('shows a confirmation popup', function () {
      mainServiceItemController.executeCustomCommand(context);
      expect(App.showConfirmationPopup.calledOnce).to.equal(true);
    });
  });

  describe("#findDependentServices()", function() {
    var mainServiceItemController;

    beforeEach(function() {
      mainServiceItemController = App.MainServiceItemController.create({});
      this.mockStackService = sinon.stub(App.StackService, 'find');
      this.mockService = sinon.stub(App.Service, 'find');
    });
    afterEach(function() {
      this.mockStackService.restore();
      this.mockService.restore();
    });

    it("no stack services", function() {
      this.mockStackService.returns([]);
      expect(mainServiceItemController.findDependentServices('S1')).to.be.empty;
    });

    it("dependent service not installed", function() {
      this.mockStackService.returns([Em.Object.create({serviceName: 'S2'})]);
      this.mockService.withArgs('S2').returns(Em.Object.create({isLoaded: false}));
      expect(mainServiceItemController.findDependentServices('S1')).to.be.empty;
    });

    it("service has no dependencies", function() {
      this.mockStackService.returns([Em.Object.create({serviceName: 'S2', requiredServices: []})]);
      this.mockService.withArgs('S2').returns(Em.Object.create({isLoaded: true}));
      expect(mainServiceItemController.findDependentServices('S1')).to.be.empty;
    });

    it("service has dependencies", function() {
      this.mockStackService.returns([Em.Object.create({serviceName: 'S2', requiredServices: ['S1']})]);
      this.mockService.withArgs('S2').returns(Em.Object.create({isLoaded: true}));
      expect(mainServiceItemController.findDependentServices('S1')).to.eql(['S2']);
    });

  });

  describe("#deleteService()", function() {
    var mainServiceItemController;

    beforeEach(function() {
      mainServiceItemController = App.MainServiceItemController.create({});
      this.mockDependentServices = sinon.stub(mainServiceItemController, 'findDependentServices');
      sinon.stub(mainServiceItemController, 'dependentServicesWarning');
      this.mockService = sinon.stub(App.Service, 'find');
      sinon.stub(App, 'showConfirmationPopup');
      sinon.stub(App.ModalPopup, 'show');
      sinon.stub(App.format, 'role', function(name) {return name});
    });
    afterEach(function() {
      this.mockDependentServices.restore();
      this.mockService.restore();
      mainServiceItemController.dependentServicesWarning.restore();
      App.showConfirmationPopup.restore();
      App.ModalPopup.show.restore();
      App.format.role.restore();
    });

    it("only one service installed", function() {
      this.mockDependentServices.returns(['S2']);
      this.mockService.returns(Em.Object.create({length: 1}));
      mainServiceItemController.deleteService('S1');
      expect(App.ModalPopup.show.calledWith({
        secondary: null,
        header: Em.I18n.t('services.service.delete.popup.header'),
        encodeBody: false,
        body: Em.I18n.t('services.service.delete.lastService.popup.body').format('S1')
      })).to.be.true;
    });

    it("service has installed dependent services", function() {
      this.mockDependentServices.returns(['S2']);
      this.mockService.returns(Em.Object.create({workStatus: 'INSTALLED'}));
      mainServiceItemController.deleteService('S1');
      expect(mainServiceItemController.dependentServicesWarning.calledWith('S1', ['S2'])).to.be.true;
    });

    it("service has not dependent services, and stopped", function() {
      this.mockDependentServices.returns([]);
      this.mockService.returns(Em.Object.create({workStatus: 'INSTALLED'}));
      mainServiceItemController.deleteService('S1');
      expect(App.showConfirmationPopup.calledOnce).to.be.true;
    });

    it("service has not dependent services, and not stopped", function() {
      this.mockDependentServices.returns([]);
      this.mockService.returns(Em.Object.create({workStatus: 'STARTED'}));
      mainServiceItemController.deleteService('S1');
      expect(App.ModalPopup.show.calledWith({
        secondary: null,
        header: Em.I18n.t('services.service.delete.popup.header'),
        encodeBody: false,
        body: Em.I18n.t('services.service.delete.popup.mustBeStopped').format('S1')
      })).to.be.true;
    });
  });

  describe("#dependentServicesWarning()", function() {
    var mainServiceItemController;

    beforeEach(function() {
      mainServiceItemController = App.MainServiceItemController.create({});
      sinon.stub(App.ModalPopup, 'show');
      sinon.stub(App.format, 'role', function(name) {return name});
    });
    afterEach(function() {
      App.ModalPopup.show.restore();
      App.format.role.restore();
    });

    it("App.ModalPopup.show should be called", function() {
      mainServiceItemController.dependentServicesWarning('S1', ['S2']);
      expect(App.ModalPopup.show.calledOnce).to.be.true;
    });
  });

  describe("#confirmDeleteService()", function() {
    var mainServiceItemController;

    beforeEach(function() {
      mainServiceItemController = App.MainServiceItemController.create({});
      sinon.stub(App.ModalPopup, 'show');
    });
    afterEach(function() {
      App.ModalPopup.show.restore();
    });

    it("App.ModalPopup.show should be called", function() {
      mainServiceItemController.confirmDeleteService();
      expect(App.ModalPopup.show.calledOnce).to.be.true;
    });
  });

  describe("#deleteServiceCall()", function() {
    var mainServiceItemController;

    beforeEach(function() {
      mainServiceItemController = App.MainServiceItemController.create({});
    });

    it("App.ajax.send should be called", function() {
      mainServiceItemController.deleteServiceCall('S1');
      var args = testHelpers.findAjaxRequest('name', 'service.item.delete');
      expect(args[0]).exists;
      expect(args[0].sender).to.be.eql(mainServiceItemController);
      expect(args[0].data).to.be.eql({
        serviceName : 'S1'
      });
    });
  });

  describe("#deleteServiceCallSuccessCallback()", function() {
    var mainServiceItemController;

    beforeEach(function() {
      mainServiceItemController = App.MainServiceItemController.create({});
      sinon.stub(window.location, 'reload');
    });
    afterEach(function() {
      window.location.reload.restore();
    });

    it("window.location.reload should be called", function() {
      mainServiceItemController.deleteServiceCallSuccessCallback();
      expect(window.location.reload.calledOnce).to.be.true;
    });
  });

});
