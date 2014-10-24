#!/usr/bin/python
# coding: utf-8

from bin import ambaribuild

# TODO move this to a proper location
def unittest():
	# parse
	result = ambaribuild.parse(["test"])
	assert result.is_test == True
	assert result.is_rebuild == False
	assert result.stack_distribution == None
	assert result.is_install_server == False
	assert result.is_install_agent == False
	assert result.is_deploy == False

	result = ambaribuild.parse(["server"])
	assert result.is_test == False
	assert result.is_rebuild == False
	assert result.stack_distribution == None
	assert result.is_install_server == True
	assert result.is_install_agent == False
	assert result.is_deploy == False

	result = ambaribuild.parse(["agent"])
	assert result.is_test == False
	assert result.is_rebuild == False
	assert result.stack_distribution == None
	assert result.is_install_server == True
	assert result.is_install_agent == True
	assert result.is_deploy == False

	result = ambaribuild.parse(["agent", "-b"])
	assert result.is_test == False
	assert result.is_rebuild == True
	assert result.stack_distribution == None
	assert result.is_install_server == True
	assert result.is_install_agent == True
	assert result.is_deploy == False

	result = ambaribuild.parse(["deploy"])
	assert result.is_test == False
	assert result.is_rebuild == False
	assert result.stack_distribution == None
	assert result.is_install_server == True
	assert result.is_install_agent == True
	assert result.is_deploy == True

	result = ambaribuild.parse(["deploy", "-b", "-s", "BIGTOP"])
	assert result.is_test == False
	assert result.is_rebuild == True
	assert result.stack_distribution == "BIGTOP"
	assert result.is_install_server == True
	assert result.is_install_agent == True
	assert result.is_deploy == True

if __name__ == "__main__":
	unittest()

