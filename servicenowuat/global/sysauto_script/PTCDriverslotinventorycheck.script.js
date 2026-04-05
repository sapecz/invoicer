// get all incidents in state "On hold" and with onhold reason "Awaiting Evidence" and where one of worknotes is "Slot inventory check was performed by driver, awaiting result"

var incidentGR = new GlideRecord('incident');
incidentGR.addQuery('state', IncidentState.ON_HOLD);
incidentGR.addQuery('hold_reason', 2); // awaiting evidence
incidentGR.query();

var incidentsToCheck = [];

while (incidentGR.next()) {

    incidentsToCheck.push(incidentGR.getUniqueValue());

}

var workNotesGR = new GlideRecord('sys_journal_field');
workNotesGR.addQuery('element', 'work_notes');
workNotesGR.addQuery('name', 'incident');
workNotesGR.addQuery('value', 'Slot inventory check was performed by driver, awaiting result');
workNotesGR.addQuery('element_id', 'IN', incidentsToCheck.toString());
workNotesGR.query();

var incidentToUpdateArr = [];

while (workNotesGR.next()) {

    incidentToUpdateArr.push(workNotesGR.getValue('element_id'));

}


var incidentsToUpdateGR = new GlideRecord('incident');
incidentsToUpdateGR.addQuery('sys_id', 'IN', incidentToUpdateArr.toString());
incidentsToUpdateGR.query();
while (incidentsToUpdateGR.next()) { // Sadly - we can't set the work_notes via updateMultiple

    incidentsToUpdateGR.state = 6;
	incidentsToUpdateGR.close_code = "dic";
	incidentsToUpdateGR.close_notes = 'Slot inventory check was performed by driver, please verify the result';
	var sd = incidentsToUpdateGR.short_description.toString();
	var substr = sd.substr(sd.indexOf(")")+2, sd.length-1);
	incidentsToUpdateGR.setValue('short_description', substr);
  //  incidentsToUpdateGR.hold_reason = 2; // awaiting evidence
    
	incidentsToUpdateGR.update();
	
}