function restoreOptions() {
	
function onError(error) {
  console.log(`Error: ${error}`);
}

function onGot(item) {
	document.querySelector("#result").value = item.result || "" ;
	result = null ;
}

var getting = browser.storage.local.get("result");
getting.then(onGot, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);

function copy() {
  var copyText = document.querySelector("#result");
  copyText.select();
  document.execCommand("Copy");
  	
  /* Hack to remove text selection */	
  var tempElement = document.createElement("input");
  tempElement.style.cssText = "width:0!important;padding:0!important;border:0!important;margin:0!important;outline:none!important;boxShadow:none!important;";
  document.body.appendChild(tempElement);
  tempElement.select();
  document.body.removeChild(tempElement);
	
  copyText.scrollTop = 1 ;
}

function save() {
  var copyText = document.querySelector("#result");
  var blob = new Blob([ copyText.value ], {type: "text/plain;charset=utf-8"});
  saveAs(blob, "exity.txt");
}

function clear() {
  document.querySelector("#result").value="";
  browser.storage.local.set({ result: "" }) ;
}

document.querySelector("#copy").addEventListener("click", copy);
document.querySelector("#save").addEventListener("click", save);
document.querySelector("#clear").addEventListener("click", clear);
