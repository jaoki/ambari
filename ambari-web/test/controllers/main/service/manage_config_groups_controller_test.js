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

var App = require('app');

describe('App.ManageConfigGroupsController', function() {

	var manageConfigGroupsController = App.ManageConfigGroupsController.create({});

	describe('#addConfigGroup', function() {
		beforeEach(function() {
			manageConfigGroupsController.addConfigGroup();
		});

		describe("#validate", function() {
			it("should display no warning if user inputs valid characters into group name", function() {

				manageConfigGroupsController.addGroupPopup.set('configGroupName', 'hello');

				expect(manageConfigGroupsController.addGroupPopup.warningMessage).to.be.empty;
			});

			it("should display warning if user inputs invalid characters into group name", function() {
				manageConfigGroupsController.addGroupPopup.set('configGroupName', '/{"!@#$%');

				expect(manageConfigGroupsController.addGroupPopup.warningMessage).to.equal('Invalid Group Name. Only alphanumerics, hyphens, spaces and underscores are allowed.');
			});
		});
	});

	describe('#renameConfigGroup', function() {
		beforeEach(function() {
			var configGroup = Ember.Object.create ({
				name: 'name',
				description: 'description'
			});

			manageConfigGroupsController.set('selectedConfigGroup', configGroup);
			manageConfigGroupsController.renameConfigGroup();
		});

		describe("#validate", function() {
			it("should display no warning if user inputs valid characters into group name", function() {
				manageConfigGroupsController.renameGroupPopup.set('configGroupName', 'hello');

				expect(manageConfigGroupsController.renameGroupPopup.warningMessage).to.be.empty;
			});

			it("should display warning if user inputs invalid characters into group name", function() {
				manageConfigGroupsController.renameGroupPopup.set('configGroupName', '/{"!@#$%');

				expect(manageConfigGroupsController.renameGroupPopup.warningMessage).to.equal('Invalid Group Name. Only alphanumerics, hyphens, spaces and underscores are allowed.');
			});
		});
	});
  
  describe('Host Name converting', function() {
    describe('#convertHostNames', function() {
      var hosts = [
        Em.Object.create({
          hostName: 'internal-1.com',
          publicHostName: 'external-1.com'
        }),
        Em.Object.create({
          hostName: 'internal-2.com',
          publicHostName: 'external-2.com'
        }),
        Em.Object.create({
          hostName: 'internal-3.com',
          publicHostName: 'external-3.com'
        })
      ];

      describe('#hostsToPublic', function() {
        beforeEach(function() {
          manageConfigGroupsController = App.ManageConfigGroupsController.create({
            clusterHosts: Em.A(hosts)
          });
        });

        var tests = [
          {
            hostsList: ['internal-1.com', 'internal-2.com', 'internal-3.com'],
            e: ['external-1.com', 'external-2.com', 'external-3.com']
          },
          {
            hostsList: 'internal-2.com',
            e: 'external-2.com'
          }
        ];
        var message = 'should convert internal host names `{0}` to external host names `{1}`';
        tests.forEach(function(test) {
          it(message.format(test.hostsList, test.e), function() {
            expect(manageConfigGroupsController.hostsToPublic(test.hostsList)).to.eql(test.e);
          });
        });
      });

      describe('#publicToHostName', function() {
        beforeEach(function() {
          manageConfigGroupsController = App.ManageConfigGroupsController.create({
            clusterHosts: Em.A(hosts)
          });
        });

        var tests = [
          {
            hostsList: ['external-1.com', 'external-2.com', 'external-3.com'],
            e: ['internal-1.com', 'internal-2.com', 'internal-3.com']
          },
          {
            hostsList: 'external-2.com',
            e: 'internal-2.com'
          }
        ];
        var message = 'should convert internal host names `{0}` to external host names `{1}`';
        tests.forEach(function(test) {
          it(message.format(test.hostsList, test.e), function() {
            expect(manageConfigGroupsController.publicToHostName(test.hostsList)).to.eql(test.e);
          });
        });
      });
    });

  });

  describe('#deleteHosts', function() {
    var hosts = [
      Em.Object.create({
        hostName: 'internal-1.com',
        publicHostName: 'external-1.com'
      }),
      Em.Object.create({
        hostName: 'internal-2.com',
        publicHostName: 'external-2.com'
      }),
      Em.Object.create({
        hostName: 'internal-3.com',
        publicHostName: 'external-3.com'
      })
    ];

    beforeEach(function() {
      manageConfigGroupsController = App.ManageConfigGroupsController.create({
        clusterHosts: hosts
      });
    });

    var createConfigGroupWithParentMock = function(groupHosts, groupPublicHosts, allHosts) {
      var parentCGHosts = allHosts.filter(function(host) {
        return !groupHosts.contains(host.get('hostName'));
      });
      return Em.Object.create({
        parentConfigGroup: {
          hosts: parentCGHosts.mapProperty('hostName'),
          publicHosts: parentCGHosts.mapProperty('publicHostName')
        },
        hosts: groupHosts,
        publicHosts: groupPublicHosts
      });
    };

    var tests = [
      {
        selectedHosts: ['external-1.com', 'external-2.com'],
        selectedConfigGroup: createConfigGroupWithParentMock(
          ['internal-1.com', 'internal-2.com'],
          ['external-1.com', 'external-2.com'], hosts),
        e: []
      },
      {
        selectedHosts: ['external-1.com'],
        selectedConfigGroup: createConfigGroupWithParentMock(
          ['internal-1.com', 'internal-2.com'],
          ['external-1.com', 'external-2.com'], hosts),
        e: ['external-2.com']
      }
    ];

    tests.forEach(function(test) {
      it('should remove {0}'.format(test.selectedHosts.slice(0)), function() {
        manageConfigGroupsController.reopen({
          selectedHosts: test.selectedHosts,
          selectedConfigGroup: test.selectedConfigGroup
        });
        manageConfigGroupsController.deleteHosts();
        expect(manageConfigGroupsController.get('selectedConfigGroup.publicHosts').toArray()).to.eql(test.e);
      });
    });

  });
});
