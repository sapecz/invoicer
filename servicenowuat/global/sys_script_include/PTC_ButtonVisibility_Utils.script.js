// Refactored in JAN2026
/**
 * Button Visibility Utilities for UI button rendering logic.
 * Determines visibility conditions for action buttons based on record state and user group membership.
 */
var PTC_ButtonVisibility_Utils = Class.create();
PTC_ButtonVisibility_Utils.prototype = {
    /**
     * Constructor initializing the utility class.
     * @function
     * @memberof PTC_ButtonVisibility_Utils
     */
    initialize: function() {},

    /**
     * Determines if a UI button should be visible based on record state and button name.
     * Handles visibility logic for: close/open exchange point, approve service, close RITM, power check/resolution.
     * @function
     * @memberof PTC_ButtonVisibility_Utils
     * @param {GlideRecord} gr - The record to evaluate
     * @param {string} buttonName - The name of the button to check visibility for
     * @returns {boolean} True if button should be visible, false otherwise
     */
    showButton: function(gr, buttonName) {
        switch (buttonName) {
            case 'close_exchange_point_and_notify_customer': //this is or
            case 'close_exchange_point':
                var operationalStatus = gr.getValue('operational_status');
                var installStatus = gr.getValue('install_status');
                var assetTag = gr.getValue('asset_tag');
                var type = gr.getValue('u_type');
                var closeCondition = (operationalStatus == '1' && installStatus == '1') && assetTag && type == 'zbox';
                return closeCondition;
            case 'open_exchange_point_and_notify_customer': //this is or
            case 'open_exchange_point':
                var operationalStatus = gr.getValue('operational_status');
                var installStatus = gr.getValue('install_status');
                var assetTag = gr.getValue('asset_tag');
                var type = gr.getValue('u_type');
                var openCondition = (operationalStatus != '1' && installStatus != '1') && assetTag && type == 'zbox';
                return openCondition;
            case 'ptc_approve_service':
                var ritmState = gr.getValue('state'); // 1 -> Open
                var zboxServicesGroups = [
                    gs.getProperty('ptc.csm.locker_service.group.l2_zbox_servics_cz'), //L2 Z-BOX Servis CZ
                    gs.getProperty('ptc.csm.locker_service.group.l2_zbox_servics_hu'), //L2 Z-BOX Servis HU
                    gs.getProperty('ptc.csm.locker_service.group.l2_zbox_servics_ro'), //L2 Z-BOX Servis RO
                    gs.getProperty('ptc.csm.locker_service.group.l2_zbox_servics_sk'), //L2 Z-BOX Servis SK
                ];
                var assignmentGroup = gr.getValue('assignment_group');
                var result = (ritmState == '1' && zboxServicesGroups.indexOf(assignmentGroup) > -1);
                return result;
            case 'ptc_close_ritm_czk_sk':
                var assetTag = gr.configuration_item.asset_tag + '';
                return gr.active && (assetTag.indexOf('CZ') > -1 || assetTag.indexOf('SK') > -1);
            case 'ptc_close_ritm_hu':
                var assetTag = gr.configuration_item.asset_tag + '';
                return gr.active && assetTag.indexOf('HU') > -1;
            case 'ptc_close_ritm_rpa_robot':
                return gr.active && (gr.order_guide == gs.getProperty('ptc.catalog.item.robot_service') || gr.cat_item == gs.getProperty('ptc.catalog.item.mass_prophylaxis') || gr.assignment_group == gs.getProperty('ptc.support.group.ww_rpa')); // Robot
            default:

        }

    },

    /**
     * Checks visibility for RITM locker inventory assignment group button.
     * Visible if assignment group is L2 Z-BOX Servis and catalog item is slot content check and user is member of group.
     * @function
     * @memberof PTC_ButtonVisibility_Utils
     * @param {GlideRecord} gr - The RITM record to evaluate
     * @returns {boolean} True if button should be visible, false otherwise
     */
    ritmLockerInventoryAssignmentGroupButton: function(gr) {

        var assignmentGroups = [
            gs.getProperty('ptc.csm.locker_service.group.l2_zbox_servics_cz'), //L2 Z-BOX Servis CZ
            gs.getProperty('ptc.csm.locker_service.group.l2_zbox_servics_hu'), //L2 Z-BOX Servis HU
            gs.getProperty('ptc.csm.locker_service.group.l2_zbox_servics_ro'), //L2 Z-BOX Servis RO
            gs.getProperty('ptc.csm.locker_service.group.l2_zbox_servics_sk'), //L2 Z-BOX Servis SK
        ];

        var slotCheckCatItemID = gs.getProperty('ptc.catalog.item.slot_content_check');

        var assignmentGroup = gr.getValue('assignment_group');
        var catItemID = gr.getValue('cat_item');

        if (assignmentGroups.indexOf(assignmentGroup) > -1 && catItemID == slotCheckCatItemID) {
            return gs.getUser().isMemberOf(assignmentGroup);
        }

        return false;
    },

    /**
     * Checks visibility for RITM power check button.
     * Visible if category is ICT, business service is WW Z-BOX, correlation code is LOCKER_NOT_COMMUNICATE,
     * and no existing 230V check RITM exists for the locker.
     * @function
     * @memberof PTC_ButtonVisibility_Utils
     * @param {GlideRecord} gr - The RITM record to evaluate
     * @returns {boolean} True if button should be visible, false otherwise
     */
    ritmPowerCheckButton: function(gr) {
        if (gr.getValue('category') == 'ict' && gr.getValue('business_service') == gs.getProperty('ptc.business_service.ww_zbox') && gr.getValue('u_correlation_code') == 'LOCKER_NOT_COMMUNICATE') {
            var ritmGR = new GlideRecord('sc_req_item');
            ritmGR.addQuery('cat_item', gs.getProperty('ptc.catalog.item.230v_check'));
            ritmGR.addQuery('configuration_item', gr.getValue('u_zbox_id'));
            ritmGR.addActiveQuery();
            ritmGR.setLimit(1);
            ritmGR.query();
            if (ritmGR.next()) {
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }
    },

    /**
     * Checks visibility for RITM power resolution button.
     * Visible only to members of specific L2 Z-BOX support groups if an active 230V check RITM exists in specified states.
     * @function
     * @memberof PTC_ButtonVisibility_Utils
     * @param {GlideRecord} gr - The incident record to evaluate
     * @returns {boolean} True if button should be visible, false otherwise
     */
    ritmPowerResolutionButton: function(gr) {
        if (gs.getUser().isMemberOf('89558282474fbe50903189cbd36d433b') || gs.getUser().isMemberOf('ad454282474fbe50903189cbd36d4399') || gs.getUser().isMemberOf('c7f40a42474fbe50903189cbd36d43ce')) {
            var ritmGR = new GlideRecord('sc_req_item');
            ritmGR.addQuery('cat_item', gs.getProperty('ptc.catalog.item.230v_check'));
            ritmGR.addQuery('configuration_item', gr.sys_id);
            var stateQuery = ritmGR.addQuery('state', -5);
            stateQuery.addOrCondition('state', 1);
            stateQuery.addOrCondition('state', 2);
            ritmGR.setLimit(1);
            ritmGR.query();
            if (ritmGR.next()) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    },

    /**
     * Checks visibility for incident form button.
     * Visible only if current user is member of incident assignment group and
     * at least one RITM under linked requests is inactive or resolved.
     * @function
     * @memberof PTC_ButtonVisibility_Utils
     * @param {GlideRecord} gr - The incident record to evaluate
     * @returns {boolean} True if button should be visible, false otherwise
     */
    incidentNSButton: function(gr) {
        var assignmentGroup = gr.getValue('assignment_group');
        if (!assignmentGroup || !gs.getUser().isMemberOf(assignmentGroup)) {
            return false;
        }

        var requestIds = [];
        var m2mGR = new GlideRecord('u_m2m_incidents_requests');
        m2mGR.addQuery('u_incident', gr.getUniqueValue());
        m2mGR.query();
        while (m2mGR.next()) {
            requestIds.push(m2mGR.getValue('u_request'));
        }

        if (!requestIds.length) {
            return false;
        }

        var ritmGR = new GlideRecord('sc_req_item');
        ritmGR.addQuery('request', 'IN', requestIds.join(','));
        var stateQuery = ritmGR.addQuery('active', false);
        stateQuery.addOrCondition('state', 6);
        stateQuery.addOrCondition('state', 3);
        ritmGR.setLimit(1);
        ritmGR.query();

        return ritmGR.next();
    },

    type: 'PTC_ButtonVisibility_Utils'
};