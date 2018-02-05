/*
Store the currently selected settings using browser.storage.local.
*/
function storeSettings() {

  function getPattern() {
    const pattern = document.getElementById("pattern") ;
    return pattern.value;
  }

  const pattern = getPattern();
  browser.storage.local.set({
    pattern
  });
}

/*
Update the options UI with the settings values retrieved from storage,
or the default settings if the stored settings are empty.
*/
function updateUI(restoredSettings) {
  const patternInput = document.getElementById("pattern") ;
  patternInput.value = restoredSettings.pattern ;
}

function onError(e) {
  console.error(e);
}

/*
On opening the options page, fetch stored settings and update the UI with them.
*/
const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(updateUI, onError);

/*
On clicking the save button, save the currently selected settings.
*/
const saveButton = document.querySelector("#save-button");
saveButton.addEventListener("click", storeSettings);
