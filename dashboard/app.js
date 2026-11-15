(function () {
  var el = document.getElementById('summary');
  if (window.RADAR) el.textContent = window.RADAR.board_size + ' rows, model ' + window.RADAR.model_version;
})();
