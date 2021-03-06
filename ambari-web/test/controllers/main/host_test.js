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
require('utils/batch_scheduled_requests');
require('controllers/main/host');
require('mappers/server_data_mapper');

describe('MainHostController', function () {

  var hostController, db;

  beforeEach(function () {
    hostController = App.MainHostController.create({});
  });

  afterEach(function () {
    hostController.destroy();
  });

  describe('#getRegExp()', function() {
    var message = '`{0}` should convert to `{1}`',
      tests = [
        { value: '.*', expected: '.*' },
        { value: '.', expected: '.*' },
        { value: '.*.*', expected: '.*' },
        { value: '*', expected: '^$' },
        { value: '........', expected: '.*' },
        { value: '........*', expected: '.*' },
        { value: 'a1', expected: '.*a1.*' },
        { value: 'a1.', expected: '.*a1.*' },
        { value: 'a1...', expected: '.*a1.*' },
        { value: 'a1.*', expected: '.*a1.*' },
        { value: 'a1.*.a2.a3', expected: '.*a1.*.a2.a3.*' },
        { value: 'a1.*.a2...a3', expected: '.*a1.*.a2...a3.*' }
      ];

    tests.forEach(function(test){
      it(message.format(test.value, test.expected), function() {
        expect(hostController.getRegExp(test.value)).to.be.equal(test.expected);
      });
    });
  });

  describe('#getQueryParameters', function() {
    beforeEach(function() {
      sinon.spy(hostController, 'getRegExp');
      sinon.stub(App.db, 'getFilterConditions', function() {
        return [{
          iColumn: 1,
          skipFilter: false,
          type: "string",
          value: "someval"
        }];
      });
    });

    afterEach(function() {
      App.db.getFilterConditions.restore();
      hostController.getRegExp.restore();
    });

    it('should call #getRegExp with value `someval` on host name filter', function() {
      hostController.getQueryParameters();
      expect(hostController.getRegExp.calledWith('someval')).to.ok;
    });

    it('result should include host name filter converted value', function() {
      expect(hostController.getQueryParameters().findProperty('key', 'Hosts/host_name').value).to.equal('.*someval.*');
    });
  });

  describe('#getSortProps', function () {

    beforeEach(function () {
      db = {mainHostController: [
        {name: 'hostName', status: 'sorting'}
      ]};
      sinon.stub(App.db, 'getSortingStatuses', function (k) {
        return db[k];
      });
      sinon.stub(App.db, 'setSortingStatuses', function (k, v) {
        db[k] = Em.typeOf(v) === 'array' ? v : [v];
      });
    });

    afterEach(function () {
      App.db.getSortingStatuses.restore();
      App.db.setSortingStatuses.restore();
    });

    it('should set default sorting condition', function () {
      hostController.getSortProps();
      expect(db.mainHostController).to.eql([{name: 'hostName', status: 'sorting_asc'}]);
    });

  });

});
