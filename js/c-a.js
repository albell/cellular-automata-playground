( function( w, doc, $ ) {
	"use strict";

	// DOM ELEMENTS
	var $window = $( w );
	var $html = $( "html" );
	var $header = $( "header" );

	var ruleCheckboxes = doc.getElementsByClassName( "rule__checkbox" );

	var $ruleNumberNumeric = $( "#rule-number-numeric" );
	var $ruleNumberSpan = $( ".rule-name-number" );
	var $mirrorNumberSpan = $( ".mirror-rule-name-number" );

	var $ringLength = $( "#length" );
	var $iteration = $( "#iteration" );
	var $gridGroup = $( "#grid-group" );
	var $initialState = $( "#initial-state" );
	var initialStateEl = $initialState[ 0 ];

	// Live nodelist is simpler than static jQuery nodelist.
	var initCheckboxes = doc.getElementsByClassName( "init__checkbox" );

	var generatedEl = doc.getElementById( "generated" );
	var $generated = $( generatedEl );

	var screenDpr = w.devicePixelRatio || 1;

	var canvas = doc.getElementById( "c" );
	var canvasMainCtx = canvas.getContext( "2d" );
	var canvasBorders = doc.getElementById( "c-inner-borders" );
	var canvasBordersCtx	= canvasBorders.getContext( "2d" );
	var canvasBoxDevicePixels;
	var canvasWidthDevicePixels;
	var canvasHeightDevicePixels;
	var urlHashCheckbox = $( "#url-hash" );
	var ruleArray;
	var initArray;
	var lengthCount;
	var iterationCount;
	var ruleAsBase2Str;
	var mirrorRuleAsBase2Str;
	var ruleNumber;
	var mirrorRuleNumber;
	var generatedArray;

	var simpleMap = Object.create( null );
	Object.defineProperties( simpleMap, {
		"111": { value: 0 },
		"110": { value: 1 },
		"101": { value: 2 },
		"100": { value: 3 },
		"011": { value: 4 },
		"010": { value: 5 },
		"001": { value: 6 },
		"000": { value: 7 }
	} );

	var opts = Object.create( null );
	Object.defineProperties( opts, {
		"setUrlHash": {
			value: false,
			writable: true
		},
		"useAnimation": {
			value: true,
			writable: true
		}
	} );

	var ignoreHashChange = false;

	// Clonable div, for speed.
	var initCell = doc.createElement( "div" );
	initCell.className = "c";

	//
	// HELPER FUNCTIONS
	//

	function debounce( func, wait ) {
		var timeout;

		// The debounced function
		return function() {

			var context = this, args = arguments;

			// Nulls out timer and calls original function
			var later = function() {
				timeout = null;
				func.apply( context, args );
			};

			// Restart the timer to call last function
			clearTimeout( timeout );
			timeout = setTimeout( later, wait );
		};
	}

	function toggleBinaryStr( b ) {
		if ( b === "0" ) {
			return "1";
		} else if ( b === "1" ) {
			return "0";
		}
	}

	function booleanToBinary( bool ) {
		return bool ? 1 : 0;
	}

	function binArrayToBinStr( binArr ) {
		var binStr = "";
		for ( var i = 0, len = binArr.length; i < len ; i++ ) {
			binStr += binArr[ i ];
		}
		return binStr;
	}

	function invertBinaryStr( base2Str ) {
		var i;
		var invertedStr = "";

		// To Calculate the mirror rule, toggle each digit. E.g.
		// 0010101 becomes
		// 1101010
		for ( i = 0 ; i < 8; i += 1 ) {
			invertedStr += toggleBinaryStr( base2Str.charAt( i ) );
		}
		return invertedStr;
	}

	function base2StrToRuleNumber( base2Str ) {
		return parseInt( base2Str, 2 );
	}

	// Accepts a base 10 number
	function ruleNumberToBase2Str( ruleNumber ) {
		var str = ruleNumber.toString( 2 );

		// Prefix with zeroes if necessary to pad to 8 characters
		while ( str.length < 8 ) {
			str = "0" + str;
		}
		return str;
	}

	function updateRuleArray( base2Str ) {
		ruleArray = new Int8Array( 8 );
		for ( var i = 0; i < 8; i += 1 ) {
			ruleArray[ i ] = parseInt( base2Str[ i ], 10 );
		}
	}

	function getBase2StrFromRuleCheckboxes() {
		var newBase2Str = "";
		var i;
		for ( i = 0; i < 8; i += 1 ) {
			newBase2Str += booleanToBinary( ruleCheckboxes[ i ].checked ).toString();
		}
		return newBase2Str;
	}

	function getInitArrayFromCheckboxes() {
		var len = initCheckboxes.length;
		initArray = new Int8Array( len ); // Clear, pre-assigned to zero

		for ( var i = 0; i < len; i++ ) {
			if ( initCheckboxes[ i ].checked ) {
				initArray[ i ] = 1;
			}
		}
	}

	function setInitStateCheckboxesFromInitArray() {
		var len = initCheckboxes.length;
		for ( var i = 0; i < len ; i += 1 ) {
			initCheckboxes[ i ].checked =  !!initArray[ i ];
		}
	}

	function updateLength() {
		lengthCount = parseInt( $ringLength.val(), 10 );
	}

	function updateIterationCount() {
		iterationCount = parseInt( $iteration.val(), 10 );
	}

	function resolveInitCellCount( diff ) {
		var addedCellsFrag;
		var newCell;
		var labelVal;
		var i;
		var last;

		if ( diff === 0 ) {
			return false; // Get out!

		} else if ( diff > 0 ) { // Add new cell(s)
			addedCellsFrag = doc.createDocumentFragment();

			for ( i = 0; i < diff; i += 1 ) {
				labelVal = "init" + ( lengthCount + i );
				newCell = initCell.cloneNode( true );
				newCell.innerHTML = "<input id='  + labelVal + ' class=init__checkbox " +
					                  "type=checkbox>" +
					                  "<label for=' + labelVal + ' class=init__label></label>";
				addedCellsFrag.appendChild( newCell );
			}

			initialStateEl.appendChild( addedCellsFrag );

		} else if ( diff < 0 ) { // Remove cell(s)

			for ( i = 0; i > diff; i -= 1 ) {
				last = initialStateEl.lastChild;
				initialStateEl.removeChild( last );
			}
		}

		lengthCount = lengthCount + diff;
	}

	function genCell( prevLeft, prev, prevRight ) {
		var concat = prevLeft.toString() +
		             prev.toString() +
		             prevRight.toString();

		// Get the "case" (a number 0 - 7)
		var theCase = simpleMap[ concat ];

		// Return either number 0 or 1
		return ruleArray[ theCase ];
	}

	function generateFullArray() {
		var i, j, prevLNebr, prevSelf, prevRNebr;

		// Initially all zeros.
		generatedArray = new Int8Array( iterationCount * lengthCount );

		// Generate the first row based on the initArray
		for ( j = 0; j < lengthCount; j += 1 ) {
			prevLNebr  = initArray[ j - 1 ];
			prevSelf     = initArray[ j ];
			prevRNebr = initArray[ j + 1 ];

			// Handle the loop cases
			if ( j === 0 ) {
				prevLNebr = initArray[ lengthCount - 1 ];
			}

			if ( j === lengthCount - 1 ) {
				prevRNebr = initArray[ 0 ];
			}
			generatedArray[ j ] = genCell( prevLNebr, prevSelf, prevRNebr );
		}

		// Generate the remaining rows
		for ( i = 1; i < iterationCount; i += 1 ) {
			for ( j = 0; j < lengthCount; j += 1 ) {

				prevLNebr = generatedArray[ ( i - 1 ) * lengthCount + j - 1 ];
				prevSelf  = generatedArray[ ( i - 1 ) * lengthCount + j ];
				prevRNebr = generatedArray[ ( i - 1 ) * lengthCount + j + 1 ];

				// Handle the loop cases
				if ( j === 0 ) {
					prevLNebr = generatedArray[ i * lengthCount - 1 ]; // -1 to left wraps
				}
				if ( j === lengthCount - 1 ) {
					prevRNebr = generatedArray[ ( i - 1 ) * lengthCount ];
				}

				generatedArray[ i * lengthCount + j ] = genCell( prevLNebr, prevSelf, prevRNebr );
			}
		}

	}

	function clearMainCanvas() {
		canvasMainCtx.clearRect( 0, 0, canvasWidthDevicePixels, canvasHeightDevicePixels );
	}

	function drawAllRects() {
		var cbdp = canvasBoxDevicePixels; // Shorter name
		for ( var i = 0; i < iterationCount; i += 1 ) {
			for ( var j = 0; j < lengthCount; j += 1 ) {
				if ( generatedArray[ i * lengthCount + j ] ) {
					canvasMainCtx.fillRect( j * cbdp, i * cbdp, cbdp, cbdp );
				}
			}
		}
	}

	function resetWindowAndCanvasDims() {
		var canvasWidthMeasuredPixels = canvas.offsetWidth * screenDpr;

		canvasBoxDevicePixels = Math.ceil( canvasWidthMeasuredPixels / lengthCount );
		canvasWidthDevicePixels = canvasBoxDevicePixels * lengthCount;
		canvasHeightDevicePixels = canvasBoxDevicePixels * iterationCount;

		// Resetting the DOM dimensions clears both canvases.
		canvas.width = canvasBorders.width = canvasWidthDevicePixels;
		canvas.height = canvasBorders.height = canvasHeightDevicePixels;

	}

	function drawCanvasBorders() {
		canvasBordersCtx.beginPath();
		canvasBordersCtx.strokeStyle = "#777777"; // Match DOM CSS. Must be reset on each call

		// Draw vertical lines
		for ( var i = 1; i < lengthCount ; i += 1 ) {
			canvasBordersCtx.moveTo( canvasBoxDevicePixels * i - 0.5, 0 );
			canvasBordersCtx.lineTo( canvasBoxDevicePixels * i - 0.5, canvasHeightDevicePixels );
		}

		// Draw horizontal lines
		for ( var j = 1; j < iterationCount; j += 1 ) {
			canvasBordersCtx.moveTo( 0, canvasBoxDevicePixels * j - 0.5 );
			canvasBordersCtx.lineTo( canvasWidthDevicePixels, canvasBoxDevicePixels * j - 0.5 );
		}
		canvasBordersCtx.stroke();
	}

	function onResize() {
		resetWindowAndCanvasDims();
		drawCanvasBorders();
		drawAllRects();
	}

	// Takes a base 10 number.
	// updates the main rule vars, html rule text.
	function updateRules( newRuleNumber ) {

		// Update all versions except array
		ruleNumber = newRuleNumber;
		ruleAsBase2Str = ruleNumberToBase2Str( newRuleNumber );
		mirrorRuleAsBase2Str = invertBinaryStr( ruleAsBase2Str );
		mirrorRuleNumber = base2StrToRuleNumber( mirrorRuleAsBase2Str );

		$ruleNumberSpan.html( ruleNumber );
		$mirrorNumberSpan.html( mirrorRuleNumber );
	}

	// Takes base 10 rule numbers, new and old
	function setNewRuleOnCheckboxesSilently( newRuleNumber, oldRuleNumber ) {

		var newRuleAsBase2Str = ruleNumberToBase2Str( newRuleNumber );
		var oldRuleAsBase2Str = ruleNumberToBase2Str( oldRuleNumber );
		var checkboxCheckedOld, checkboxCheckedNew;

		// Check or uncheck only the rule checkboxes that have changed.
		for ( var i = 0; i < 8; i += 1 ) {
			checkboxCheckedOld = ruleCheckboxes[ i ].checked;
			checkboxCheckedNew = !!( parseInt( oldRuleAsBase2Str.charAt( i ), 10 ) );

			if ( newRuleAsBase2Str[ i ] !== oldRuleAsBase2Str[ i ] ) {

				// Silent, doesn't trigger the jQuery "change" handler.
				ruleCheckboxes[ i ].checked = !!( parseInt( newRuleAsBase2Str.charAt( i ), 10 ) );

			}
		}
	}

	function setWindowHashSilently() {
		if ( opts.setUrlHash ) {
			ignoreHashChange = true;
			w.location.hash = "#rule=" + ruleAsBase2Str +
			                  "&init=" + binArrayToBinStr( initArray ) +
			                  "&iter=" + iterationCount;
		}
	}

	function deserializeHash( hash ) {
		var hashObj = Object.create( null );
		var hashArray = hash.split( "&" );
		var i;
		var len = hashArray.length;
		var s;

		for ( i = 0 ; i < len; i += 1 ) {
			if ( !hashArray[ i ] ) {
				continue;
			}
			s = hashArray[ i ].split( "=" );
			Object.defineProperty( hashObj, s[ 0 ], {
				value: s[ 1 ]
			} );
		}
		return hashObj;
	}

	function updateValsFromHash() {

		var hash, hashObj, initArrayFromHash, numericHashIter, oldRuleNumber;

		if ( w.location.hash ) {
			hash = w.location.hash.substring( 1 );
		}
		if ( !hash ) {
			return false;
		}

		hashObj = deserializeHash( hash );

		if ( hashObj ) {

			// Turn shareable URLS on in the UI.
			opts.setUrlHash = true;
			urlHashCheckbox.prop( "checked", true );
		}

		// Only set it if it has changed, to avoid touching the DOM.
		if ( hashObj.rule &&
		     hashObj.rule.length === 8 &&
		     hashObj.rule !== ruleAsBase2Str ) {
			ruleAsBase2Str = hashObj.rule;
			oldRuleNumber = ruleNumber; // Store for comparison
			ruleNumber = base2StrToRuleNumber( ruleAsBase2Str );

			$ruleNumberNumeric.val( ruleNumber );
			setNewRuleOnCheckboxesSilently( ruleNumber, oldRuleNumber );
			updateRules( ruleNumber );
			updateRuleArray( ruleNumberToBase2Str( ruleNumber ) );
		}

		if ( hashObj.init ) {
			initArrayFromHash = hashObj.init.split( "" ).map( function( str ) {
				return parseInt( str, 10 );
			} );

			if ( initArray !== initArrayFromHash ) {
				initArray = initArrayFromHash;
				$ringLength.val( hashObj.init.length ); // Set the numeric input

				resolveInitCellCount( hashObj.init.length - lengthCount );
				setInitStateCheckboxesFromInitArray();

			}
		}

		if ( hashObj.iter ) {
			numericHashIter = parseInt( hashObj.iter, 10 );
			if ( numericHashIter !== iterationCount ) { // Use non-strict equality
				iterationCount = numericHashIter;
				$iteration.val( hashObj.iter ); // Set the numeric input
			}
		}
	}

	//
	// INITIAL SETUP
	//

	// RULE
	// Get the rule from markup
	ruleAsBase2Str = getBase2StrFromRuleCheckboxes();
	updateRuleArray( ruleAsBase2Str );
	updateRules( base2StrToRuleNumber( ruleAsBase2Str ) );

	// INIT STATE
	//
	// Get the initArray from markup
	getInitArrayFromCheckboxes();
	updateLength();

	// ITERATIONS
	//
	// Get the iteration from markup
	updateIterationCount();

	// On initial load, overwrite the markup values with any different values from the hash.
	updateValsFromHash();

	resetWindowAndCanvasDims();
	drawCanvasBorders();
	generateFullArray();
	drawAllRects();

	//
	// EVENT BINDINGS
	//

	$window.on( "hashchange", function handleHashChange() {

		// Effectively only respond to hashchange events from user typing in the URL bar
		if ( ignoreHashChange === false ) {
			updateValsFromHash();
			drawCanvasBorders();
			generateFullArray();
			drawAllRects();
		}
		ignoreHashChange = false;
	} );

	$( ruleCheckboxes ).on( "change", function handleRuleCheckboxChange() {

		// Update the Wolfram Rule Number based on the combination selected
		// http://wolframscience.com/nksonline/pageimages/0053.gif
		ruleNumber = base2StrToRuleNumber( getBase2StrFromRuleCheckboxes() );
		$ruleNumberNumeric.val( ruleNumber )
		                  .triggerHandler( "change" );
	} );

	$ruleNumberNumeric.on( "change", function( event, previousRulePassed ) {
		var oldRuleNumber;

		if ( previousRulePassed !== undefined ) {
			oldRuleNumber = previousRulePassed;
		} else {
			oldRuleNumber = ruleNumber;
		}

		ruleNumber = parseInt( $( this ).val(), 10 );

		setNewRuleOnCheckboxesSilently( ruleNumber, oldRuleNumber );
		updateRules( ruleNumber );
		updateRuleArray( ruleNumberToBase2Str( ruleNumber ) );
		setWindowHashSilently();
		generateFullArray();
		clearMainCanvas();
		drawAllRects();
	} );

	$( ".mirror-rule-button" ).on( "click", function setMirrorRule() {
		var oldRuleNumber = ruleNumber;
		ruleNumber = mirrorRuleNumber;
		$ruleNumberNumeric.val( mirrorRuleNumber )
		                  .triggerHandler( "change", oldRuleNumber );
	} );

	$( "[data-go-to-rule]" ).on( "click", function goToRule() {
		var oldRuleNumber = ruleNumber;
		ruleNumber = parseInt( $( this ).attr( "data-go-to-rule" ), 10 );
		$ruleNumberNumeric.val( ruleNumber )
		                  .triggerHandler( "change", oldRuleNumber );
	} );

	// Wire big touch buttons to the numeric inputs
	$( ".plus-button, .minus-button" ).on( "mousedown keypress", function() {
		var $input = $( this ).siblings( "input" );
		var currentVal = parseInt( $input.val(), 10 );
		var newVal;
		var min = parseInt( $input.attr( "min" ) );
		var max = parseInt( $input.attr( "max" ) );
		var direction = $( this ).attr( "data-direction" );

		if ( direction === "increment" ) {
			if ( currentVal === max ) {
				return false; // Stop the event and get out!
			}
			newVal = currentVal + 1;
		} else if ( direction === "decrement" ) {
			if ( currentVal === min ) {
				return false;
			}
			newVal = currentVal - 1;
		}

		$input.val( newVal ).triggerHandler( "change" );
	} );

	// Add/subtract cells from init ringlength based on input number change event
	$ringLength.on( "change", function() {
		var diff = $( this ).val() - lengthCount;

		resolveInitCellCount( diff );
		getInitArrayFromCheckboxes();
		setWindowHashSilently();
		resetWindowAndCanvasDims();
		drawCanvasBorders();
		generateFullArray();
		clearMainCanvas();
		drawAllRects();
	} );

	$iteration.on( "change", function() {
		updateIterationCount();
		setWindowHashSilently();
		resetWindowAndCanvasDims();
		drawCanvasBorders();
		generateFullArray();
		clearMainCanvas();
		drawAllRects();
	} );

	$initialState.on( "change", ".init__checkbox", function() {
		getInitArrayFromCheckboxes();
		setWindowHashSilently();
		resetWindowAndCanvasDims();
		drawCanvasBorders();
		generateFullArray();
		clearMainCanvas();
		drawAllRects();
	} );

	// TWEAK DEFAULT DOM EVENT TIMINGS

	// Fire "change" on each keydown, and don't wait for blur or the return key,
	// because it is annoying for the user to have to leave the input to get
	// the change and then possibly return later.
	$( ".numeric-input" ).on( "keydown", function( e ) {
		var that = this;

		function changeHandler() {
			$( that ).triggerHandler( "change" );
		}

		if ( ( e.which >  47 && e.which <  58 ) || // Number key
		     ( e.which === 8 ) ) {                 // Delete key
			w.setTimeout( changeHandler, 0 );

		// Don't fire a change event when the user is tabbing out.
		// Arrow keys have their own change events directly so don't double-fire.
		}	else if ( e.which ===  9 ||  // Tab
			          e.which === 37 ||  // Left arrow
					      e.which === 38 ||  // Up arrow
					      e.which === 39 ||  // Right arrow
					      e.which === 40 ) { // Down arrow
			return; // Not false, still do the default action

		} else { // Must be a letter key, or punctuation.
			return false; // Don't add the letter (?)
		}
	} );

	$( ".rule__label" ).on( "mousedown", function() {
		$( this ).siblings( "input" ).trigger( "click" );
		return false;
	} );

	$initialState.on( "mousedown", ".init__label", function() {
		$( this ).siblings( "input" ).trigger( "click" );
		return false;
	} );

	// Disable standard click events on labels to prevent duplicate events.
	// Harsh but probably necessary.
	$( ".rule__label" ).on( "click", function() {
		return false;
	} );

	$initialState.on( "click", ".init__label", function() {
		return false;
	} );

	w.addEventListener( "resize", debounce( onResize, 30 ) );

	// FLEXBOX DETECT
	// TO DO: AMPLIFY THIS WARNING AND TEST FOR OTHER REQUIRED FEATURES
	( function( $ ) {
		var div = doc.createElement( "div" );
		div.style.flexBasis = "1px";

		var warning = $( "<p class=no-support-warning>Warning: Your browser doesn't" +
		" support <a href='http://caniuse.com/#feat=flexbox'>CSS Flexbox</a>," +
		" which is required for this page. Please use the latest version of " |
		"Firefox, Chrome, or Opera to use this site.</p>" );
		if ( !div.style.flexBasis ) {
			$( "body" ).prepend( warning );
		}
	}( jQuery ) );

	//
	// GENERAL UI
	//

	// Remove instructions and highlights once the user has started clicking.
	$( "[data-hide-instructions]" ).on( "click", function() {
		$html.removeClass( "show-instructions" );
		$header.slideUp( "slow" );
	} );

	$( "[data-show-instructions]" ).on( "click", function() {
		$html.addClass( "show-instructions" );
		$header.slideDown( "slow" );
	} );

	// Hide focus outlines unless the tab key gets hit.
	$html.on( "keydown.tablistener", function( e ) {
		if ( e.which === 9 ) { // Tab key pressed.
			$html.removeClass( "tab-inactive" );
			$html.off( "keydown.tablistener" );
		}
	} );

	$( "[data-show-menu], [data-hide-menu]" ).on( "click", function() {
		$html.toggleClass( "show-menu" );
	} );

	$( ".more-options__button" ).on( "click", function() {
		$( "html, body" ).animate( {
			scrollTop: 0
		}, 1000 );
	} );

	$( "#show-init-borders" ).on( "change", function() {
		$( "#initial-state" ).toggleClass( "show-borders" );
	} );

	$( "#show-gen-borders" ).on( "change", function() {
		canvasBorders.classList.toggle( "c-inner-borders--hidden" );
	} );

	$( "#show-labels" ).on( "change", function() {
		$generated.toggleClass( "show-counter" );
	} );

	$( "#limit-grid" ).on( "change", function() {
		$gridGroup.toggleClass( "limit-grid-width" );
	} );

	$( "#animate-grid-refresh" ).on( "change", function() {
		$generated.toggleClass( "generated--animate" );
		opts.useAnimation = $( this ).prop( "checked" );
	} );

	urlHashCheckbox.on( "change", function() {
		if ( $( this ).prop( "checked" ) ) {
			opts.setUrlHash = true;
			setWindowHashSilently();
		} else {
			opts.setUrlHash = false;

			// Remove hash including the ugly "#" using history
			// replaceState doesn't work locally :p
			// http://stackoverflow.com/questions/1397329/how-to-remove-the-hash-from-
			// window-location-with-javascript-without-page-refresh
			if ( "replaceState" in history &&
			     w.location.protocol.indexOf( "http" ) === 0 ) {
				history.replaceState( "", doc.title, w.location.pathname + w.location.search );
			} else {
				w.location.hash = "";
			}
		}
	} );

	// Make fake span labels check and uncheck the relevant checkboxes
	$( ".stylish-checkbox__text" ).on( "click", function() {
		$( this ).siblings( "input" ).click();
	} );

}( window, document, jQuery ) );
