# Ext.ux.Router

Lightweight JavaScript routing engine for [Ext JS 4 MVC](link:http://docs.sencha.com/ext-js/4-0/#!/guide/application_architecture) based on 
[javascript-route-matcher](https://github.com/cowboy/javascript-route-matcher) project.  It enables your application to monitor URL changes 
and dispatch controllers actions based on defined routes. It also provides browser history navigation capabilities.

Check the [CHANGELOG](https://raw.github.com/brunotavares/Ext.ux.Router/master/CHANGELOG.txt)

## Getting Started

    $ git clone git@github.com:brunotavares/Ext.ux.Router.git
    
It comes with:

 * Router.js
 * [Examples](https://github.com/brunotavares/Ext.ux.Router/tree/master/examples)
 * [Tests](https://github.com/brunotavares/Ext.ux.Router/tree/master/test/index.html)

### Usage

1. Copy Router.js to your application. Folder suggested {root}/lib/Router.js;

2. Configure Ext.Loader path:


        Ext.Loader.setConfig({
            enabled: true,
            paths: {
                'Ext.ux.Router': 'lib/Router.js'
            }
        });


3. Add the class requirement to your application start and setup routes (see below the Route Format):

        Ext.application({
            name: 'App',
            autoCreateViewport: true,
            requires: [
                'Ext.ux.Router'
            ],
            controllers: [
                'Home', 
                'Users'
            ],
            views: [
                'Viewport',
                'user.List',
                'user.Form'
            ],
            routes: {
                '/': 'home#index',
                'users': 'users#list',
                'users/:id/edit': 'users#edit'
            }
        });
    
5. Create your controllers and actions according to your routes;

        Ext.define('App.controller.Home', {
            extend: 'Ext.app.Controller',
            index: function() {
                //TODO: index
            }
        });
    
        Ext.define('App.controller.Users', {
            extend: 'Ext.app.Controller',
            list: function() {
                //TODO: render list
            },
            edit: function(params) {
                //TODO: render edit
            }
        });

## Route Format

This is a summary of the test cases present on test/index.html. You can check this file for more info on what
are all the route formats and what they match.

Essentially you can specify: 

 * simple routes 'users';
 * routes with parameters 'users/:id/:login';
 * routes with splat 'users?*args';
 * mixed routes 'users/:id/*roles/:login/*groups';
 * regular expressions '/^(users?)(?:\\/(\\d+)(?:\\.\\.(\\d+))?)?/'.

In addition, routes can have validators, so you can check if the id is integer, etc.

    routes: {
        '/': 'home#index',
        
		'users'                         : 'users#index',
		'users/:id'                     : 'users#show',
        'users/:id/:login'              : 'users#show',
        'users/*names'                  : 'users#showAll',
        'users/*ids/*names'             : 'users#showAll',
        'users/:id/*roles/:name/*groups': 'users#show',
        
        'search/:query/p:page'              : 'search#exec',
        '*first/complex-:part/*rest'        : 'home#complex',
        ':entity?*args'                     : 'home#base',
        
        
        'invoices/:id': {
            controller: 'invoices',
            action: 'show',
            id: /^\d+$/
        },
        
        'groups/:id': {
			controller: 'groups',
			action: 'show',
			id: function(value) {
				return value.match(/^\d+$/);
			}
		},
        
        'clients or client': {
            regex: /^(clients?)(?:\/(\d+)(?:\.\.(\d+))?)?/,
            controller: 'clients',
            action: 'index'
        }
    }

# License    

Copyright 2012 Bruno Tavares<br />
Released under the MIT license<br />
Check MIT-LICENSE.txt