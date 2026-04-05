(function executeAssignToNS() {
	var ritmGR = getFirstLinkedResolvedOrInactiveRitm(current);
	if (!ritmGR) {
		gs.addErrorMessage('No resolved or inactive RITM linked to this incident was found.');
		action.setRedirectURL(current);
		return;
	}

	var networkAssignmentGroup = getNetworkAssignmentGroup(current);
	if (!networkAssignmentGroup) {
		gs.addErrorMessage('Unable to determine Network assignment group from CMDB CI display value.');
		action.setRedirectURL(current);
		return;
	}

	var childIncidentGR = new GlideRecord('incident');
	childIncidentGR.initialize();

	childIncidentGR.setValue('parent_incident', current.getUniqueValue());
	childIncidentGR.setValue('description', ritmGR.getValue('close_notes'));
	childIncidentGR.setValue('short_description', 'Network: ' + current.getValue('short_description'));
	childIncidentGR.setValue('assignment_group', networkAssignmentGroup);

	copyField(current, childIncidentGR, 'contact_type');
	copyField(current, childIncidentGR, 'impact');
	copyField(current, childIncidentGR, 'urgency');
	copyField(current, childIncidentGR, 'priority');
	copyField(current, childIncidentGR, 'location');
	copyField(current, childIncidentGR, 'cmdb_ci');
	copyField(current, childIncidentGR, 'service_offering');
	copyField(current, childIncidentGR, 'business_service');
	copyField(current, childIncidentGR, 'subcategory');
	copyField(current, childIncidentGR, 'category');
	copyField(current, childIncidentGR, 'caller_id');
	copyField(current, childIncidentGR, 'u_zbox_id');

	var childIncidentId = childIncidentGR.insert();
	if (!childIncidentId) {
		gs.addErrorMessage('Failed to create child Network incident.');
		action.setRedirectURL(current);
		return;
	}

	current.setValue('state', 3);
	current.setValue('hold_reason', 4);
	current.update();

	gs.addInfoMessage('Network incident ' + childIncidentGR.getDisplayValue('number') + ' was created.');
	action.setReturnURL(current);
	action.setRedirectURL(childIncidentGR);

	function getFirstLinkedResolvedOrInactiveRitm(incidentGR) {
		var requestIds = [];
		var m2mGR = new GlideRecord('u_m2m_incidents_requests');
		m2mGR.addQuery('u_incident', incidentGR.getUniqueValue());
		m2mGR.query();
		while (m2mGR.next()) {
			requestIds.push(m2mGR.getValue('u_request'));
		}

		if (!requestIds.length) {
			return null;
		}

		var linkedRitmGR = new GlideRecord('sc_req_item');
		linkedRitmGR.addQuery('request', 'IN', requestIds.join(','));
		var inactiveOrResolvedQuery = linkedRitmGR.addQuery('active', false);
		inactiveOrResolvedQuery.addOrCondition('state', 6);
		inactiveOrResolvedQuery.addOrCondition('state', 3);
		linkedRitmGR.orderBy('sys_created_on');
		linkedRitmGR.setLimit(1);
		linkedRitmGR.query();

		if (!linkedRitmGR.next()) {
			return null;
		}

		return linkedRitmGR;
	}

	function getNetworkAssignmentGroup(incidentGR) {
		var ciDisplayValue = (incidentGR.getDisplayValue('cmdb_ci') || '').trim();

		if (ciDisplayValue.indexOf('SK') === 0) {
			return gs.getProperty('ptc.csm.group.l1_network_sk');
		}

		if (ciDisplayValue.indexOf('CZ') === 0) {
			return gs.getProperty('ptc.csm.group.l1_network_cz');
		}

		return '';
	}

	function copyField(sourceGR, targetGR, fieldName) {
		targetGR.setValue(fieldName, sourceGR.getValue(fieldName));
	}
})();
