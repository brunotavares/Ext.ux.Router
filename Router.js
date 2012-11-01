/*!
 * Ext.ux.Router
 * http://github.com/brunotavares/Ext.ux.Router
 *
 * Copyright 2012 Bruno Tavares
 * Released under the MIT license
 * Check MIT-LICENSE.txt
 */
 /*
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
Ext.define('Ext.ux.Router', {
    singleton: true,
    alternateClassName: 'Ext.Router',
    mixins: {
        observable: 'Ext.util.Observable'
    },
    requires: [
        'Ext.util.History', 
        'Ext.app.Application'
    ],
    
    // @private
    constructor: function() {
        var me = this;
        me.ready = false;
        me.routes = [];
        me.mixins.observable.constructor.call(me);
    },

    /**
     * Initializes Ext.History and processes the first token (generaly home, main, index, etc).
     * @private
     */
    init: function(app) {
        var me = this,
            history = Ext.History;
        
        if (me.ready) {
            return;
        }
        
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
        
        me.app = app;
        me.ready = true;
        me.processRoutes();
        
        history.init();
		history.on('change', me.parse, me);
		
        Ext.onReady(function() {
            me.parse(history.getToken());
        });
    },

    /**
     * Convert routes string definied in Ext.Application into structures objects.
     * @private
     */
    processRoutes: function() {
        var key,
            appRoutes = this.app.routes;
        
        //<debug warn>
        if (!appRoutes && Ext.isDefined(Ext.global.console)) {
            Ext.global.console.warn("[Ext.ux.Router] No routes were found. Consider defining routes object in your Ext.application definition.");
        }
        //</debug>
        
        for (key in appRoutes) {
            if (appRoutes.hasOwnProperty(key)) {
                this.routeMatcher(key, appRoutes[key]);
            }
        }
    },

    /**
     * Creates a matcher for a route config, based on 
     * {@link https://github.com/cowboy/javascript-route-matcher javascript-route-matcher}
     * @private
     */ 
    routeMatcher: function(route, rules) {
        var routeObj, action,
            me      = this,
            routes  = me.routes,
            reRoute = route,
            reParam = /([:*])(\w+)/g,
            reEscape= /([-.+?\^${}()|\[\]\/\\])/g,
            names   = [];
        
        if (rules.regex) {
            routeObj = {
                route       : route,
                regex       : rules.regex,
                controller  : Ext.String.capitalize(rules.controller),
                action      : rules.action
            };
            
            delete rules.controller;
            delete rules.action;
            routeObj.rules = rules;
        }
        else {
            
            reRoute = reRoute.replace(reEscape, "\\$1").replace(reParam, function(_, mode, name) {
                names.push(name);
                return mode === ":" ? "([^/]*)" : "(.*)";
            });
            
            routeObj = {
                route   : route,
                names   : names,
                matcher : new RegExp("^" + reRoute + "$")
            };
            
            if (Ext.isString(rules)) {
                action = rules.split('#');
                
                routeObj.controller = Ext.String.capitalize(action[0]);
                routeObj.action     = action[1];
                routeObj.rules      = undefined;
            }
            else {
                
                routeObj.controller = Ext.String.capitalize(rules.controller);
                routeObj.action     = rules.action;
                
                delete rules.controller;
                delete rules.action;
                routeObj.rules = rules;
            }
        }
        
        //<debug error>
        if (!routeObj.controller && Ext.isDefined(Ext.global.console)) {
            Ext.global.console.error("[Ext.ux.Router] Config 'controller' can't be undefined", route, rules);
        }
    
        if (!routeObj.action && Ext.isDefined(Ext.global.console)) {
            Ext.global.console.error("[Ext.ux.Router] Config 'action' can't be undefined", route, rules);
        }
        //</debug>
        
        routes.push(routeObj);
    },

    /**
     * Receives a url token and goes trough each of of the defined route objects searching
     * for a match.
     * @private
     */
    parse: function(token) {
        var route, matches, params, names, j, param, value, rules,
            me      = this,
            routes  = me.routes,
            i       = 0,
            len     = routes.length;
        
        token = token||"";
        
        for (; i < len; i++) {
            route = routes[i];
            
            if (route.regex) {
                matches = token.match(route.regex);
                
                if (matches) {
                    matches = matches.slice(1);
                    
                    if (me.dispatch(token, route, matches)) {
                        return { captures: matches };
                    }
                }
            }
            else {
                matches = token.match(route.matcher);
                
                if (token === '' && route.route === '/') {
                    matches = [];
                }
                
                if (matches) {
                    params  = {};
                    names   = route.names;
                    rules   = route.rules;
                    j       = 0;
                    
                    while (j < names.length) {
                        param = names[j++];
                        value = matches[j];
          
                        if (rules && param in rules && !this.validateRule(rules[param], value)) {
                            matches = false;
                            break;
                        }
                        
                        params[param] = value;
                    }
                    
                    if (matches && me.dispatch(token, route, params)) {
                        return params;
                    }
                }
            }
        }
        
        me.fireEvent('routemissed', token);
        return false;
    },
    
    /**
     * Each route can have rules, and this function ensures these rules. They could be Functions,
     * Regular Expressions or simple string strong comparisson.
     * @private
     */
    validateRule: function(rule, value) {
        if (Ext.isFunction(rule)) {
            return rule(value);
        }
        else if (Ext.isFunction(rule.test)) {
            return rule.test(value);
        }
        
        return rule === value;
    },
    
    /**
     * Tries to dispatch a route to the controller action. Fires the 'beforedispatch' and 
     * 'dispatch' events.
     * @private
     */    
    dispatch: function(token, route, params) {
        var controller,
            me      = this;
        
        if (me.fireEvent('beforedispatch', token, route, params) === false) {
            return false;
        }

        //<debug error>
        controller = me.app.getModuleClassName(route.controller, 'controller');
        controller = Ext.ClassManager.get(controller);
        
        if (!controller && Ext.isDefined(Ext.global.console)) {
            Ext.global.console.error("[Ext.ux.Router] Controller not found ", route.controller);
        }
        //</debug>
        
        controller = me.app.getController(route.controller);
        
        //<debug error>
        if (!controller[route.action] && Ext.isDefined(Ext.global.console)) {
            Ext.global.console.error("[Ext.ux.Router] Controller action not found ", route.controller, route.action);
        }
        //</debug>
        
        controller[route.action].call(controller, params, token, route);
        me.fireEvent('dispatch', token, route, params, controller);
        
        return true;
    },
    
    /**
     * Redirects the page to other URI.
     * @param {String} uri URI Token
     * @param {Boolean} [preventDuplicates=true] When true, if the passed token matches the current token
     * it will not save a new history step. Set to false if the same state can be saved more than once
     * at the same history stack location.
     */
    redirect: function(token, preventDup) {
        var history = Ext.History;
        
        if (preventDup !== true && history.getToken() === token) {
            this.parse(token);
        }
        else {
            history.add(token);
        }
    }
},
function() {
    /*
     * Patch Ext.Application to auto-initialize Router
     */
    Ext.override(Ext.app.Application, {
        enableRouter: true,
        onBeforeLaunch: function() {
            this.callOverridden();
        
            if(this.enableRouter){
                Ext.ux.Router.init(this);
            }
        }
    });
});