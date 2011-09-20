/**
 * @class Ext.ux.Router
 * @extend Ext.app.Controller
 * 
 * Enables routing engine for Ext JS 4 MVC architecture. Responsible for parsing URI Token and fire a dispatch action 
 * process. Uses Ext.History internally to detect URI Token changes, providing browser history navigation capabilities.
 * 
 *      Ext.application({
 *          name: 'MyApp',
 *          ...
 *          paths: {
 *              'Ext.ux': 'app/ux'
 *          },
 *          routes: {
 *              '/': 'home#index',
 *              'users': 'users#list',
 *              'users/:id/edit': 'users#edit'
 *          }
 *      });
 * 
 * Given the routing example above, we would develop controllers specifying their correspondents actions.
 * 
 *      Ext.define('AM.controller.Users', {
 *          extend: 'Ext.app.Controller',
 *          views: ['user.List', 'user.Edit'],
 *          stores: ['Users'],
 *          models: ['User'],
 *
 *      //actions
 *          list: function()
 *          {
 *              //TODO: show users list
 *          },
 *
 *          edit: function(params)
 *          {
 *              //TODO: show user form
 *          }
 *      });
 *
 * @docauthor Bruno Tavares
 */
Ext.define('Ext.ux.Router', (function()
{
    var pub,
        app,
        initialised = false,
        routes = [],
        regColumn = /^:/;
    
    /**
     * Utility for removing string slashes
     * @param {String} string The string.
     * @param {Boolean} both (optional) True to remove slash from first position also. Defaults to the false.
     * @return String sanitized. 
     * @private
     */
    function removeSlash(string, both)
    {
        string = string.split('');
        if(string[string.length - 1] === '/'){
            string.pop();
        }
        if(both && string[0] === '/'){
            string.shift();
        }
        return string.join('');
    }
    
    /**
     * Convert routes string definied in Ext.Application into structures objects.
     * @private
     */
    function processRoutes()
    {
        if(!app.routes){
            Ext.global.console.warn("No routes were found. Consider defining routes object in your Ext.application definition.");
            return;
        }
        
        Ext.iterate(app.routes, function(route, value)
        {
            value = value.split('#');
            route = removeSlash(route, true);
            
            routes.push({
                controller  : Ext.String.capitalize(value[0]),
                action      : value[1],
                sections    : route.split('/')
            });
        });
    }
    
    /**
     * Tries to parse and URL string param into their correspondent JavaScript type (e.g. &id=3, "3" into 3).
     * @param {String} value Value to be parsed.
     * @return {Mixed} Value parsed.
     * @private
     */
    function parseValue(value)
    {
        if(Ext.isNumeric(value))
        {
            return parseFloat(value, 10);
        }
        
        return value;
    }
    
    /**
     * Renders Ext.History form and initializes it.
     * @private
     */
    function initHistory()
    {
        Ext.getBody().createChild({
            tag : 'form',
            id  : 'history-form' ,
            cls : Ext.baseCSSPrefix + 'hide-display',
            html: [
                '<input type="hidden" id="',Ext.History.fieldId,'" />',
                '<iframe id="',Ext.History.iframeId,'"></iframe>'
            ].join('')
		});
		
		Ext.History.init();
		Ext.History.on('change', pub.processURI, pub);
    }
    
    pub = {
        singleton: true,
        requires: ['Ext.util.History', 'Ext.form.field.Date'],
        mixins: {
            observable: 'Ext.util.Observable'
        },
        
        /**@private*/
        init: function(application)
        {
            app = application;
            pub = Ext.ux.Router;
            
            if(initialised){
                return;
            }
            
            initialised = true;
            processRoutes();
            
            Ext.onReady(function()
            {
                initHistory();
                pub.processURI(Ext.History.getToken());
            });
        },
        
        /**
         * Receives an URI Token, parses it, and find a respective route, firing 'dispatch' event. 
         * If no route is found, fires 'routemissed' event.
         * @param {String} uri URI token (e.g. 'home/index', 'users/1/edit')
         */
        processURI: function(uri)
        {
            var controller,
                uriObject = pub.decomposeURI(uri),
                match = this.findMatch(uriObject),
                params = Ext.apply({}, uriObject.params);
            
            if(match === false){
                pub.fireEvent('routemissed', uri);
                return false;
            }
            
            Ext.iterate(match.sections, function(section, i)
            {
                if(regColumn.test(section))
                {
                    section = section.replace(regColumn, '');
                    params[section] = uriObject.sections[i];
                }
            });
            
            Ext.iterate(params, function(key, value)
            {
                params[key] = parseValue(value);
            });
            
            if(pub.fireEvent('beforedispatch', uri, match, params) === false){
                return;
            }
            
            controller  = app.getController(match.controller);
            controller[match.action].call(controller, params);
            pub.fireEvent('dispatch', uri, match, params, controller);
        },
        
        /**
         * Given an URI, decompose into sections and params (e.g. 'help/list?viewID=3&details=1' into {sections: 
         * ['help', 'list'], params: {viewID:3, details: 1}} )
         * @param {String} uri URI Token.
         * @return {Object} URI decomposed sections and params.
         */
        decomposeURI: function(uri)
        {
			uri = (uri||"").toString().trim();
			uri	= uri.split('?');
			
			return {
			    sections: removeSlash(uri[0]).split('/'),
			    params  : Ext.Object.fromQueryString(uri[1]||'', true)
			};
        },
        
        /**
         * Finds a match for a given URI.
         * @param {String/Object} uri URI Token
         * @return {Object} match The route match or false.
         */
        findMatch: function(uri)
        {
            var match = false, i, l, sectionRoute, sectionUri;
                
            if(Ext.isString(uri)){    
                uri = pub.decomposeURI(uri);
            }
            
            Ext.iterate(routes, function(route)
            {
                if(route.sections.length !== uri.sections.length){
                    return;
                }
                
                match = true;
                
                for(i = 0, l = route.sections.length ; i < l ; i++ )
                {
                    sectionRoute= route.sections[i];
					sectionUri  = uri.sections[i];
					
                    if(sectionRoute !== sectionUri && !regColumn.test(sectionRoute))
                    {
                        match = false;
                        break;
                    }
				} 
				
				if(match)
				{
					match = route;
					return false;
				}
            });
            
            return match;
        },
        
        /**
         * Redirects the page to other URI.
         * @param {String} uri URI Token
         */
        redirect: function(uri)
        {
            Ext.History.add(uri);
        }
    };
    return pub;

}()), function()
{
    var me = this;
    me.addEvents(
        
        /**
         * @event routemissed
         * Fires when no route is found for a given URI Token
         * @param {String} uri The URI Token
         */
        'routemissed', 
        
        /**
         * @event beforedispatch
         * Fires before loading controller and calling its action.  Handlers can return false to cancel the dispatch
         * process.
         * @param {String} uri URI Token.
         * @param {Object} match Route that matched the URI Token.
         * @param {Object} params The params appended to the URI Token.
         */
        'beforedispatch', 
        
        /**
        * @event dispatch
        * Fires after loading controller and calling its action.
        * @param {String} uri URI Token.
        * @param {Object} match Route that matched the URI Token.
        * @param {Object} params The params appended to the URI Token.
        * @param {Object} controller The controller handling the action.
        */
        'dispatch'
    );
    me.mixins.observable.constructor.call(me);
});

/*
 * Patch Ext.Application to auto-initialize Router
 */
Ext.override(Ext.app.Application, {
    enableRouter: true,
    onBeforeLaunch: function() 
    {
        this.callOverridden();
        
        if(this.enableRouter){
            Ext.ux.Router.init(this);
        }
    }
});