"use strict";

function openSummaryDialog() {
  $("#summaryDialog").dialog("open");
}

$(function() {
  $("#summaryDialog").dialog({
    autoOpen: false,
    width: "50%"
  });
});
