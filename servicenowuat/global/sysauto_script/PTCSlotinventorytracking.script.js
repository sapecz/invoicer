/*
Scheduled job script body for slot inventory tracking follow-up.
Schedule in sysauto_script:
- Daily at 07:30 and 19:30
*/

(function executeSlotInventoryTracking() {
	var WORKNOTE_TEXT = 'Slot inventory check was performed by driver, awaiting result';
	var RESOLVED_INCIDENT_NOTE = 'Shipment found by technician';
	var TRACKING_FOUND_NOTE = 'ZB SUPPORT: Zásilka evidována v interním trasování.';
	var TRACKING_LOST_NOTE = 'ZB SUPPORT: Zásilka nebyla následující 4 dny po provedení řidičské inventury zaevidována v interním trasování.';
	var FOUND_RESOLUTION_VALUE = 'Shipment_found';
	var LOST_RESOLUTION_VALUE = 'Shipment_lost';
	var TARGET_STATUS_CODES = {
		'20': true,
		'21': true,
		'22': true
	};
	var FOUR_WORKDAYS = 4;

	var incidentAnchorById = getIncidentAnchors(WORKNOTE_TEXT, RESOLVED_INCIDENT_NOTE);
	var incidentIds = Object.keys(incidentAnchorById);

	if (!incidentIds.length) {
		gs.info('PTCSlotinventorytracking: No matching incidents found.');
		return;
	}

	var caseGR = new GlideRecord('sn_customerservice_case');
	caseGR.addActiveQuery();
	caseGR.addQuery('state', '!=', 6);
	caseGR.addQuery('incident', 'IN', incidentIds.join(','));
	caseGR.query();

	while (caseGR.next()) {
		var incidentId = caseGR.getValue('incident');
		var anchorGdt = incidentAnchorById[incidentId];

		if (!anchorGdt) {
			continue;
		}

		var isShipmentFound = checkShipmentFoundInTracking(caseGR);

		if (isShipmentFound) {
			resolveCase(caseGR, TRACKING_FOUND_NOTE, FOUND_RESOLUTION_VALUE);
			continue;
		}

		if (isOlderThanFourWorkdays(anchorGdt)) {
			resolveCase(caseGR, TRACKING_LOST_NOTE, LOST_RESOLUTION_VALUE);
		}
	}


	function getIncidentAnchors(worknoteText, resolvedIncidentNote) {
		var anchorByIncident = {};

		// 1) Active incidents where required worknote exists.
		var activeIncidentIds = [];
		var activeIncidentGR = new GlideRecord('incident');
		activeIncidentGR.addActiveQuery();
		activeIncidentGR.query();
		while (activeIncidentGR.next()) {
			activeIncidentIds.push(activeIncidentGR.getUniqueValue());
		}

		if (activeIncidentIds.length) {
			var wnGR = new GlideRecord('sys_journal_field');
			wnGR.addQuery('name', 'incident');
			wnGR.addQuery('element', 'work_notes');
			wnGR.addQuery('value', worknoteText);
			wnGR.addQuery('element_id', 'IN', activeIncidentIds.join(','));
			wnGR.orderByDesc('sys_created_on');
			wnGR.query();

			while (wnGR.next()) {
				var wnIncidentId = wnGR.getValue('element_id');
				// Keep latest matching worknote as day 0 reference.
				if (!anchorByIncident[wnIncidentId]) {
					anchorByIncident[wnIncidentId] = new GlideDateTime(wnGR.getValue('sys_created_on'));
				}
			}
		}

		// 2) Resolved incidents with requested close note.
		var resolvedIncidentGR = new GlideRecord('incident');
		resolvedIncidentGR.addQuery('state', IncidentState.RESOLVED);
		resolvedIncidentGR.addQuery('close_notes', resolvedIncidentNote);
		resolvedIncidentGR.query();
		while (resolvedIncidentGR.next()) {
			var resolvedIncidentId = resolvedIncidentGR.getUniqueValue();
			var resolvedAt = resolvedIncidentGR.getValue('resolved_at');
			if (!resolvedAt) {
				resolvedAt = resolvedIncidentGR.getValue('sys_updated_on');
			}
			anchorByIncident[resolvedIncidentId] = new GlideDateTime(resolvedAt);
		}

		return anchorByIncident;
	}

	function checkShipmentFoundInTracking(caseGR) {
		var packetId = caseGR.getValue('u_zasilka_id');
		if (!packetId) {
			return false;
		}

		var caseCreatedOn = new GlideDateTime(caseGR.getValue('sys_created_on'));

		try {
			var rm = new sn_ws.RESTMessageV2('Service Operations', 'tracking');
			rm.setStringParameterNoEscape('packetId', packetId);

			var response = rm.execute();
			var status = response.getStatusCode();
			if (status !== 200) {
				gs.warn('PTCSlotinventorytracking: Tracking API returned status ' + status + ' for case ' + caseGR.getUniqueValue());
				return false;
			}

			var body = response.getBody();
			if (!body) {
				return false;
			}

			var payload = JSON.parse(body);
			var items = (((payload || {}).data || {}).items) || [];

			for (var i = 0; i < items.length; i++) {
				var item = items[i] || {};
				var statusCode = (item.statusCode || '').toString();
				if (!TARGET_STATUS_CODES[statusCode]) {
					continue;
				}

				var itemDate = parseTrackingDate(item.dateTime);
				if (!itemDate) {
					continue;
				}

				if (itemDate.after(caseCreatedOn)) {
					return true;
				}
			}
		} catch (ex) {
			gs.error('PTCSlotinventorytracking: Tracking check failed for case ' + caseGR.getUniqueValue() + '. Error: ' + ex);
		}

		return false;
	}

	function parseTrackingDate(rawDate) {
		if (!rawDate) {
			return null;
		}

		try {
			return new GlideDateTime(rawDate.toString());
		} catch (e) {
			return null;
		}
	}

	function isOlderThanFourWorkdays(anchorDateTime) {
		var anchorDate = toUtcStartOfDay(anchorDateTime);
		var nowDate = toUtcStartOfDay(new GlideDateTime());

		if (nowDate.getTime() <= anchorDate.getTime()) {
			return false;
		}

		var workdaysElapsed = 0;
		var cursor = new Date(anchorDate.getTime());
		cursor.setUTCDate(cursor.getUTCDate() + 1); // day after anchor = day 1

		while (cursor.getTime() <= nowDate.getTime()) {
			if (!isWeekend(cursor)) {
				workdaysElapsed++;
				if (workdaysElapsed >= FOUR_WORKDAYS) {
					return true;
				}
			}

			cursor.setUTCDate(cursor.getUTCDate() + 1);
		}

		return false;
	}

	function toUtcStartOfDay(gdt) {
		var raw = gdt.getValue(); // yyyy-MM-dd HH:mm:ss (UTC)
		var jsDate = new Date(raw.replace(' ', 'T') + 'Z');
		jsDate.setUTCHours(0, 0, 0, 0);
		return jsDate;
	}

	function isWeekend(jsDate) {
		var day = jsDate.getUTCDay();
		return day === 0 || day === 6;
	}


	function resolveCase(caseGR, resolutionNote, daktelaResolutionValue) {
		caseGR.state = 6;
		caseGR.close_notes = resolutionNote;
		caseGR.u_daktela_resolution = daktelaResolutionValue;
		caseGR.resolution_code = 33;
		caseGR.update();

		resolveLinkedIncident(caseGR, resolutionNote);
	}

	function resolveLinkedIncident(caseGR, resolutionNote) {
		var incidentId = caseGR.getValue('incident');
		if (!incidentId) {
			return;
		}

		var incidentGR = new GlideRecord('incident');
		if (!incidentGR.get(incidentId)) {
			return;
		}

		incidentGR.setValue('state', 6);
        incidentGR.setValue('close_notes', resolutionNote);
        incidentGR.setValue('close_code', 'Solved by Automation');
		incidentGR.update();
	}
})();
