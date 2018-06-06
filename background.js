/*
 Default parameters initialisation
 pattern: "^.*$" 
 pattern: "^.+/(digishop.|mapi|apigw|itf-gateway)/.*$"
*/
var defaultSettings = {
  pattern: "^.*$" 
  , timeout: 30
  , maxlines: 1000
  , result: ""
};


/*
  Define browser
*/
var browser = browser || chrome ;

//browser.storage.local.clear() ; // To clear storage
browser.storage.local.set({ result: "" }) ; // To clear result only

/*
Generic error logger.
*/
function onError(e) {
  console.error(e);
}

/*
On startup, check whether we have stored settings.
If we don't, then store the default settings.
*/
function checkStoredSettings(storedSettings) {
  if ( !storedSettings.pattern || storedSettings.pattern.length==0 ) {
    browser.storage.local.set(defaultSettings);
  } else if( !storedSettings.result ) { 
	storedSettings.result = defaultSettings.result ;
	browser.storage.local.set(storedSettings) ;
  }
}

const gettingStoredSettings = browser.storage.local.get();
gettingStoredSettings.then(checkStoredSettings, onError);
/* Fin de l'initialisation des options par defaut */


var req = [] ;
var mm = 100 ;

function printJSON( json ) {
	console.log( JSON.stringify(json,null,"\t") ) ;
}

function addResponseBody(requestId,str) {
	if( req[requestId%mm].response.body==null ) { req[requestId%mm].response.body = "" ; }
	req[requestId%mm].response.body = req[requestId%mm].response.body + str ;
}

function endRequest(requestId) {
	req[requestId%mm].status = true ;
}

function ASCIICount(str) {
	if( typeof(str)!=='string' ) {
		return 0 ;
	}
	var nb = 0 ;
	if( str.length>0 )
	for( var i=0 ; i<str.length ; i++ ) {
		if( (str.charCodeAt(i)>=32) && (str.charCodeAt(i)<=165) ) {
			nb++ ;
		}
	}
	return nb ;
}

function doInit(details,pattern) {
	var re = new RegExp( pattern ) ;
	if( details.url&&details.url.match(re) ) {
		requestId = details.requestId ;
		req[requestId%mm] = { request: {}, response: {}, status: false } ;
		req[requestId%mm].request.method = details.method ;
		req[requestId%mm].request.originUrl = details.originUrl ;
		req[requestId%mm].request.uri = details.url ;
		req[requestId%mm].tabId = details.tabId ;
		req[requestId%mm].timeStamp = details.timeStamp ;
		req[requestId%mm].requestId = details.requestId ;
	
		if( details.requestBody ) {
			if( details.requestBody.raw ) {
				if( details.requestBody.raw[0] ) {
					var enc = new TextDecoder("utf-8");
					req[requestId%mm].request.body = enc.decode(details.requestBody.raw[0].bytes) ;				
				}
			} else if( details.requestBody.formData ) {
				req[requestId%mm].request.body = "" ;
				if( Object.keys(details.requestBody.formData).length>0 ) {
					for( var prop in details.requestBody.formData ) {
						if( req[requestId%mm].request.body.length>0 ) { req[requestId%mm].request.body = req[requestId%mm].request.body + "&" ; }
						req[requestId%mm].request.body = req[requestId%mm].request.body + prop + (details.requestBody.formData.prop?("="+details.requestBody.formData.prop):"") ;
					}
				} 
			} else { req[requestId%mm].request.body = null ; }
		} else { 
			req[requestId%mm].request.body = null ; 
		}
		req[requestId%mm].response.body = null ;
		
		let filter = browser.webRequest.filterResponseData(details.requestId);
		let decoder = new TextDecoder("utf-8");
		let encoder = new TextEncoder();
		
		filter.ondata = event => {
			let str = decoder.decode(event.data, {stream: true});
			if( str.length>0 ) {
				if( (100.*ASCIICount(str)/str.length)>75. ) {
					addResponseBody( details.requestId, str ) ;
				}
			}
			endRequest( details.requestId ) ;
			//filter.write(encoder.encode(str));
			filter.write(event.data);
			filter.disconnect();
		}
	} 
}

function doBeforeRequest(details) {
	if( details.tabId != -1 ) {
		requestId = details.requestId ;
		
		var getting = browser.storage.local.get() ;
		getting.then( 
			function(item) { 
				doInit(details,item.pattern)
	
			}
		, function(error) { console.log(`Error: ${error}`); } 
	) ;
	}
	return {};
}

browser.webRequest.onBeforeRequest.addListener(
	doBeforeRequest,
	{ urls: ["<all_urls>"] },
	["blocking","requestBody"]
) ;
	
function doBeforeSendHeaders(details) {
	requestId = details.requestId ;
	if( req[requestId%mm] ) {
		req[requestId%mm].request.headers = [ ] ;
		if( details.requestHeaders )
		if( details.requestHeaders.length > 0 ) {
			for (var i = 0; i < details.requestHeaders.length; ++i) {
				req[requestId%mm].request.headers.push( { name: details.requestHeaders[i].name, value: details.requestHeaders[i].value  } ) ;
			}
		}
	}
	return {} ;
}

browser.webRequest.onBeforeSendHeaders.addListener(
	doBeforeSendHeaders,
        {urls: ["<all_urls>"]},
		["blocking", "requestHeaders"]
) ;

function doHeadersReceived(details) {
	requestId = details.requestId ;
	if( req[requestId%mm] ) {
		req[requestId%mm].response.status = details.statusCode ;
		req[requestId%mm].response.message = details.statusLine.replace(/HTTP\/[^ ]* [0-9]{3} /,"") ;
		req[requestId%mm].response.headers = [ ] ;
		if( details.responseHeaders) 
		if( details.responseHeaders.length>0 ) {
			for (var i = 0; i < details.responseHeaders.length; ++i) {
				req[requestId%mm].response.headers.push( { name: details.responseHeaders[i].name, value: details.responseHeaders[i].value } ) ;
			}
		}
	}
}
	
browser.webRequest.onHeadersReceived.addListener(
	doHeadersReceived,
	{urls: ["<all_urls>"]},
	["responseHeaders"]
) ;
	
function convStr(r) {
	var str = "" ;
	str = "\n-- "+r.request.uri+" -----------------------------------------------------------------\n" ;
	str += r.request.method + " " + r.request.uri.replace(/^http(s)?:\/\//,"").replace(/^[^/]*/,"") + "\n" ;
	if( r.request.headers.length>0 ) {
		for( i=0 ; i<r.request.headers.length ; i++ ) {
			str += r.request.headers[i].name + ": " +r.request.headers[i].value + "\n" ;
		}
	}
	str += "\n" ;
	if( r.request.body!=null ) { str += r.request.body + "\n" ; }
	str += "\n" ;
	str += r.response.status + " " + r.response.message + "\n" ;
	if( r.response.headers && r.response.headers.length>0 ) {
		for( i=0 ; i<r.response.headers.length ; i++ ) {
			if( r.response.headers[i].name.match(/^Set-Cookie$/i) ) { 
				str += r.response.headers[i].name + ": " + r.response.headers[i].value.replace(/\n/g,"\nSet-Cookie: ") + "\n" ;
			} else { str += r.response.headers[i].name + ": " + r.response.headers[i].value + "\n" ; }
		}
	}
	str += "\n" ;
	if( r.response.body!=null ) { str += r.response.body + "\n" ; }
	return str ;
}

/* Function to sort remove null value */
function uniq(a) {
	return a.sort().filter(function(item) {
		return item!=null ;
	})
}

function doSave( r ) {
	if(r) {
	console.log( "Exity match: "+r.request.uri ) ;
	var getting = browser.storage.local.get() ;
	getting.then( 
		function(item) { 
			item.result = item.result + convStr(r) ;
			tab = item.result.split(/\r\n|\r|\n/) ;
			if( tab.length>defaultSettings.maxlines ) { // On garde les dernière lignes
				tab.splice( tab.length-defaultSettings.maxlines ) ;
				item.result = "" ;
				for( i=0 ; i<tab.length ; i++ ) {
					item.result = item.result + tab[i] + '\r\n' ;
				}
			}
			//console.log( convStr(r) ) ;
			browser.storage.local.set(item) ;
		}
		, function(error) { console.log(`Error: ${error}`); } 
	) ;
	}
}

/* Pour sauvegarder on est obligé de laisser passer un délai pour être sûr d'avoir reçu le body de la reponse */
function end(requestId,nb) {
	if( (req[requestId%mm].status==false)&&(nb<defaultSettings.timeout) ) {
		setTimeout( function(){ end(requestId,nb+1) ; }, 1000 ) ; 
	} else { 
		doSave( req[requestId%mm] ) ; 
		req[requestId%mm] = null ;
	}
}

function doCompleted(details) {
	requestId = details.requestId ;
	//printJSON(req);
	if( req[requestId%mm] ) {
		setTimeout( function(){ end(details.requestId,0) ; }, 200 ) ;
	}
}

browser.webRequest.onCompleted.addListener(
	doCompleted
	,
	{urls: ["<all_urls>"]},
	["responseHeaders"]
) ;

