(function() {
	'use strict';

	ObjectsServicesFunction.$inject = ["$timeout", "apiServices", "generalServices", "uiServices"];

	function ObjectsServicesFunction($timeout, apiServices, generalServices, uiServices) {

		var methods = {
			askReportObject: askReportObject
		};

		function askReportObject(args) {
			var
			modalOptions = { alias: args.nameField, hashProperty: "classnameField", hash: args.classnameField, content: "map", types: ["objectData", "objectBugged"] },
			newModal = uiServices.createModal('SendReport', modalOptions);

			newModal.result.then(function(choice) {
				if (choice.choice) { generalServices.sendReport(choice); }
				else { return false; }
			});
		}

		return methods;
	}

	exports.function = ObjectsServicesFunction;
})();