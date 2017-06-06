"use strict";

function openSummaryDialog() {
  $("#summaryDialog").dialog("open");
}

function openReportDialog(){
	$("#reportDialog").dialog("open");
}

$(function() {
  $("#summaryDialog").dialog({
    autoOpen: false,
    width: "50%"
  });
});

$(function() {
  $("#reportDialog").dialog({
    autoOpen: false,
    width: "60%"
  });
});
