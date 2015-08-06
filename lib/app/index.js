var fs		= require('fs');
var path	= require('path');

var semver	= require('semver');
var sizeOf	= require('image-size');

var categories = [ 'lights', 'video', 'music', 'appliances', 'security', 'climate', 'services' ];

function App( app_path ){
	this.app_path = app_path;
}

App.prototype.validate = function(){
	
	var result = {
		success: true,
		errors: []
	}
	
	function error( message ) {
		result.success = false;
		result.errors.push( message );
	}
	
	// check if required files exist
	if( !fileExistsSyncCaseSensitive( this.app_path ) ) 
		error("app folder does not exist");
		
	if( !fileExistsSyncCaseSensitive( path.join(this.app_path, 'app.js') ) ) 
		error("app.js does not exist");
		
	if( !fileExistsSyncCaseSensitive( path.join(this.app_path, 'app.json') ) )
		error("app.json does not exist");
		
	if( !fileExistsSyncCaseSensitive( path.join(this.app_path, 'assets') ) )
		error("./assets/ does not exist");
		
	if( !fileExistsSyncCaseSensitive( path.join(this.app_path, 'assets', 'icon.svg') ) )
		error("./assets/icon.svg does not exist");
		
	if( !fileExistsSyncCaseSensitive( path.join(this.app_path, 'README.md') ) )
		error("README.md does not exist");
	
	// don't continue if one of the errors fired
	if( result.errors.length > 0 ) return result;
		
	// try to parse the json
	try {
		var json = JSON.parse( fs.readFileSync(path.join( this.app_path, 'app.json' )) );
	} catch(e){
		error("Invalid JSON in app.json [" + e.toString() + "]");
		
		// don't continue if json didn't validate
		return result;
	}
	
	// check if required json entries exist 
	if( typeof json.id == 'undefined' )
		error("missing `id` in app.json");
	
	if( typeof json.version == 'undefined' )
		error("missing `version` in app.json");
	
	if( typeof json.version != 'undefined' ){
		if( !semver.valid(json.version) )
			error("invalid `version` in app.json");
	}
	
	if( typeof json.compatibility == 'undefined' )
		error("missing `compatibility` in app.json");
	
	if( typeof json.compatibility != 'undefined' ){
		if( !semver.validRange(json.compatibility) )
			error("invalid `compatibility` in app.json");
	}
	
	if( typeof json.name == 'undefined' )
		error("missing `name` in app.json");
	
	if( typeof json.name == 'object' ) {
		if( typeof json.name.en == 'undefined' )
			error("missing `name.en` in app.json");
	}
	
	if( typeof json.description == 'undefined' )
		error("missing `description` in app.json");
	
	if( typeof json.description == 'object' ) {
		if( typeof json.description.en == 'undefined' )
			error("missing `description.en` in app.json");
	}
	
	if( typeof json.category == 'string' ) {
		if( categories.indexOf(json.category) < 0 )
			error("invalid category `" + json.category + "` in app.json. Allowed categories: [" + categories.join(', ') + "]");
	} else {
		error("missing `category` in app.json");
	}
	
	if( typeof json.contributors != 'undefined' ) {
		
		[ 'developers', 'translators' ].forEach(function(contributor_type){
		
			if( Array.isArray(json.contributors[contributor_type]) ) {
				json.contributors[contributor_type].forEach(function(contributor, i){
					if( typeof contributor == 'object' ) {
						if( typeof contributor.name != 'string' )
							error("contributors." + contributor_type + "[" + i + "].name is undefined or not a string");		
							
						if( typeof contributor.email != 'string' )
							error("contributors." + contributor_type + "[" + i + "].email is undefined or not a string");					
							
						if( contributor_type == 'translators' ) {
							if( Array.isArray(contributor.languages) ) {
								contributor.languages.forEach(function(language, j){
									if( typeof language != 'string' ) 
										error("contributors." + contributor_type + "[" + i + "].languages[" + j + "] is not a string");	
								})
							} else {
							error("contributors." + contributor_type + "[" + i + "].languages is not an array");	
							}
						}	
							
					} else {
						error("contributors." + contributor_type + "[" + i + "] is not an object");					
					}
						
				});
			} else if( typeof json.contributors[contributor_type] != 'undefined' ) {
				error("contributors.developers is not an array");
			}
		
		})
	}
	
	// check images
	if( typeof json.images == 'object' ) {
		for( var image in json.images ) {
			var image_path = path.join( this.app_path, json.images[image] );
			if( fileExistsSyncCaseSensitive( image_path ) ) {
				
				var image_size = sizeOf( image_path );
				
				// check size
				if( image == 'large' && ( image_size.width != 500 || image_size.height != 350 ) )
					error("images." + image + " has invalid dimensions (" + image_size.width + "x" + image_size.height + "), must be 500x350");
					
				if( image == 'small' && ( image_size.width != 250 || image_size.height != 175 ) )
					error("images." + image + " has invalid dimensions (" + image_size.width + "x" + image_size.height + "), must be 250x175");
									
			} else {
				error("images." + image + " file (" + json.images[image] + ") does not exist");
			}
			
		}
	}
	
	// validate drivers
	if( Array.isArray(json.drivers) ) {
		json.drivers.forEach(function(driver, i){
			
			if( typeof driver.id == 'undefined' )
				return error("missing `driver[" + i + "].id` in app.json");
			
			if( !fileExistsSyncCaseSensitive( path.join( this.app_path, 'drivers', driver.id ) ) )
				return error("missing folder for driver " + driver.id);					
			
			if( typeof driver.name == 'undefined' )
				error("missing `driver[" + i + "].name` in app.json");
	
			if( typeof driver.name == 'object' ) {
				if( typeof driver.name.en == 'undefined' )
					error("missing `driver[" + i + "].name.en` in app.json");
			
			if( typeof driver.class == 'undefined' )
				error("missing `driver[" + i + "].class` in app.json");
			
			if( !Array.isArray(driver.capabilities) )
				error("missing `driver[" + i + "].capabilities` in app.json");
			}
			
			if( Array.isArray(driver.pair) ) {
				driver.pair.forEach(function(view, j) {			
					if( typeof view.id == 'undefined' )
						return error("missing `driver[" + i + "].pair[" + j + "].id` in app.json");
						
					// if no template set, require a html file
					if( typeof view.template == 'undefined' ) {
						if( !fileExistsSyncCaseSensitive( path.join( this.app_path, 'drivers', driver.id, 'pair') ))
							return error("missing /drivers/" + driver.id + "/pair/ folder")
							
						if( !fileExistsSyncCaseSensitive( path.join( this.app_path, 'drivers', driver.id, 'pair', view.id + '.html') ))
							return error("missing /drivers/" + driver.id + "/pair/" + view.id + ".html")
					}
				}.bind(this))
			}
	
			// check images
			if( typeof driver.images == 'object' ) {
				for( var image in driver.images ) {
					
					var image_path = path.join( this.app_path, driver.images[image] );
					var image_ext = path.extname( image_path );
					if( image_ext != '.jpg' && image_ext != '.png' ) {
						error("drivers[" + i +  "].images." + image + " file (" + driver.images[image] + ") is not a .jpg or .png file");
						continue;
					}
					
					if( fileExistsSyncCaseSensitive( image_path ) ) {
				
						var image_size = sizeOf( image_path );
						
						if( image == 'large' && ( image_size.width != 500 || image_size.height != 500 ) )
							error("drivers[" + i +  "].images." + image + " has invalid dimensions (" + image_size.width + "x" + image_size.height + "), must be 500x500");
					
						if( image == 'small' && ( image_size.width != 75 || image_size.height != 75 ) )
							error("drivers[" + i +  "].images." + image + " has invalid dimensions (" + image_size.width + "x" + image_size.height + "), must be 75x75");
						
					} else {
						error("drivers[" + i +  "].images." + image + " file (" + driver.images[image] + ") does not exist");
					}
				}
			}
				
		}.bind(this))
	}
	
	// validate flow
	if( typeof json.flow == 'object' ) {
		for( var column in json.flow ) {
			
			json.flow[ column ].forEach(function(card, i){
				
				if( typeof card.id == 'undefined' )
					error("missing flow." + column + "[" + i + "].id in app.json")
					
				if( typeof card.title == 'undefined' )
					error("missing flow." + column + "[" + i + "].title in app.json")
					
				if( typeof card.title == 'object' ) {
					if( typeof card.title.en == 'undefined' )
					error("missing flow." + column + "[" + i + "].title.en in app.json")				
				}
				
				if( Array.isArray(card.args) ) {
					card.args.forEach(function(arg, j){
					
						if( typeof arg.name == 'undefined' )
							error("missing flow." + column + "[" + i + "].arg[" + j + "].name in app.json")
					
						if( typeof arg.type == 'undefined' )
							error("missing flow." + column + "[" + i + "].arg[" + j + "].type in app.json")
								
					}.bind(this))
					
				}
				
			}.bind(this))
			
		}
	}
	
	// validate settings
	// require index.html if folder exists		
	if( fileExistsSyncCaseSensitive( path.join( this.app_path, 'settings' ) ) && !fileExistsSyncCaseSensitive( path.join( this.app_path, 'settings', 'index.html' ) ) )
		error("missing ./settings/index.html");
		
	// validate speech
	if( Array.isArray(json.speech) ) {
		json.speech.forEach(function(trigger, i){
				
			if( typeof trigger.id == 'undefined' )
				error("missing speech[" + i + "].id in app.json")
				
			if( typeof trigger.importance != 'number' )
				error("invalid speech[" + i + "].importance in app.json, must be of type number")
				
			if( typeof trigger.importance == 'number' ) {
				if( trigger.importance < 0 || trigger.importance > 1 ) 
					error("speech[" + i + "].importance is out of range [0-1]")
				
			if( typeof trigger.synonyms == 'undefined' )
				error("missing speech[" + i + "].synonyms in app.json")
			
			if( typeof trigger.synonyms == 'object' )
				if( !Array.isArray(trigger.synonyms.en) ) 
					error("missing speech[" + i + "].synonyms.en in app.json")
			}
			
		}.bind(this));
	}
	
	// validate permissions
	if( Array.isArray(json.permissions) ) {
		json.permissions.forEach(function(permission, i){
			
			var permission_parts = permission.split(':');
			if( permission_parts[0] != 'homey' || permission_parts.length != 3 ) 
				return error("invalid permission[" + i + "] in app.json")
				
			if( permission_parts[1] != 'app' ) {
				var devkit_lib = require('../..');
				var allowed_permissions = devkit_lib.permissions.getPermissions();
				
				var valid = false;
				for( var allowed_permission in allowed_permissions ) {
					if( permission == allowed_permission ) valid = true;
				}
				
				if( !valid ) return error("invalid permission `" + permission + "`")
			}
			
		}.bind(this))
	}
	
		
	return result;
}

function fileExistsSyncCaseSensitive( file_path ) {
	
	var dir = path.dirname( file_path );
	
	if( !fs.existsSync(dir) ) return false;
	
	var dirContents = fs
		.readdirSync( dir )
	
	var exists = dirContents.indexOf( path.basename(file_path) ) > -1;
	return exists;
	
}

module.exports = App;