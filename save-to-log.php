<?php
  $log_file_name = 'bug_log.log';
  $message = $_POST['message'];
  $time_label = date("Y-m-d",time());
  $entry = $time_label . " " . $message . "\n";
  file_put_contents($log_file_name, $entry, FILE_APPEND);
  header('Location: /'); // redirect back to the main site
