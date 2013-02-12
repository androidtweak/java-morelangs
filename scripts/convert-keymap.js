/* Small scripts that converts jQuery.IME rules files into XML files  
 *
 * I understand that `eval` is evil. But in this case, that's ok. 
 * This is a build script, notihng more. And it is `eval`ing code
 * that is from the wikimedia foundation. I expect that nothing
 * horribly dangerous to go through :) */
var fs = require('fs');
var xmlbuilder = require('xmlbuilder');
var _ = require('underscore');
var findit = require('findit');
var path = require('path');

var translitMethods = [
    'mr-transliteration',
    'am-transliteration',
    'as-transliteration',
    'bn-avro',
    'bn-probhat',
    'as-avro',
    'as-bornona',
    'hi-transliteration',
    'hi-bolnagri',
    'ipa-sil',
    'kn-transliteration',
    'kn-kgp',
    'ml-transliteration',
    'ne-transliteration',
    'or-transliteration',
    'or-lekhani',
    'pa-transliteration',
    'pa-phonetic',
    'sa-transliteration',
    'si-singlish',
    'ta-transliteration',
    'te-transliteration',
    'eo-transliteration',
    'as-phonetic',
    'gu-hponetic',
    'hi-phonetic',
    'mr-phonetic',
    'or-phonetic'
];

/* TODO: Replace with proper options handling */
var inputPath = process.argv[2];
var outputPath = process.argv[3];

function attrsFromRules( rules ) {
    var attrs = {
        id: rules.id,
        name: rules.name,
        description: rules.description,
        author: rules.author,
        version: rules.version,
        contextLength: typeof rules.contextLength !== 'undefined' ? rules.contextLength : 0,
        maxKeyLength: typeof rules.maxKeyLength !== 'undefined' ? rules.maxKeyLength : 1,
        filename: rules.id + '.xml'
    };

    _.each( attrs, function( value, key ) {
        if( typeof value === 'undefined' || value === null) {
            delete attrs[ key ];
        }
    } );
    return attrs;
}

function processRules( rules ) {
    /* Since some rules access and modify other ones */
    jQuery.ime.inputmethods[ rules.id ] = rules;

    var attrs = attrsFromRules( rules );
    var xml = xmlbuilder.create('inputmethod');

    _.each( rules.patterns_x, function( pattern ) {
        if( pattern.length === 2) {
            xml.ele( 'pattern', {
                input: pattern[0],
                replacement: pattern[1],
                altGr: true
            } );
        } else {
            xml.ele( 'pattern', {
                input: pattern[0],
                context: pattern[1],
                replacement: pattern[2],
                altGr: true
            } );
        }
    } );
    _.each( rules.patterns, function( pattern ) {
        if( pattern.length === 2) {
            xml.ele( 'pattern', {
                input: pattern[0],
                replacement: pattern[1]
            } );
        } else {
            xml.ele( 'pattern', {
                input: pattern[0],
                context: pattern[1],
                replacement: pattern[2]
            } );
        }
    } );
    xml.root();
    _.each( attrs, function( value, key ) {
        // Having the filename as an attribute in the file makes no sense
        if( key !== 'filename' ) {
            xml.att( key, value );
        }
    } );

    var outputFile = path.join( outputPath, attrs.filename );
    var xmlStr = xml.end( { pretty: true } );

    fs.writeFile( outputFile, xmlStr, function( err ) {
        if( err ) {
            console.log( err );
        }
    } );
}

// Stub jQuery object, has the only method that we want
var jQuery = {
    ime: {
        register: processRules,
        inputmethods: {},
        languages: {},
        sources: {}
    },
    each: function( iter, fun ) { /* Since jQuery's each takes parameters in reverse order of _'s */
        _.each( iter, function( value, key ) { 
            fun( key, value );
        } );
    },
    extend: _.extend
};

findit.find( inputPath ).on( 'file', function( fileName, stat ) {
    if( fileName.match( /\.js$/ ) ) {
        fs.readFile( fileName, 'utf8', function( err, data ) {
            console.log( "Reading " + fileName );
            eval( data ); // See note about eval on file header
        } );
    }
} ).on( 'end', function() {

    fs.readFile( path.join( inputPath, '../src/jquery.ime.inputmethods.js' ), 'utf8', function( err, data ) {
        eval( data ); // See note about evail on file header

        var resourcesXML = xmlbuilder.create('input-method');
        var stringXML = xmlbuilder.create('strings');

        // Prevent duplicates, if one IM is there for multiple languages
        var alreadyAdded = [];

        _.each( jQuery.ime.languages, function( value, key ) {
            _.each( value.inputmethods, function( imName ) {
                if( _.contains( translitMethods, imName )  && !_.contains( alreadyAdded, imName )) {
                    var displayName = 'keyboard_name_' + imName.replace( '-', '_' );
                    var subTypeXML = resourcesXML.ele( 'subtype', {
                        'android:icon': '@drawable/ic_subtype_keyboard',
                        'android:label': '@string/' + displayName,
                        'android:imeSubtypeLocale': key,
                        'android:imeSubtypeMode': 'keyboard',
                        'android:imeSubtypeExtraValue': 'KeyboardLayoutSet=qwerty,TransliterationMethod=' + imName
                    } );
                    stringXML.ele( 'string', { 
                            'name': displayName
                        }, value.autonym + ' - ' + jQuery.ime.sources[ imName ].name
                    );
                    alreadyAdded.push( imName );
                }
            } );
        } );
        

        var xmlString = resourcesXML.end( { pretty: true } );
        console.log( xmlString );

        var stringString = stringXML.end( { pretty: true } );
        console.log( stringString );
    } );
} );
