// Let Ext know where Ext.ux.Router is
Ext.Loader.setConfig({
    enabled: true,
    paths: {
        'Ext.ux.Router': '../../Router.js'
    }
});

Ext.application({
    name: 'App',
    autoCreateViewport: true,
    
    requires: [
        'Ext.ux.Router', // Require the UX
        'Ext.window.MessageBox'
    ],
    
    controllers: [
        'Home',
        'Settings',
        'Users'
    ],
    
    views: [
        'home.Index',
        'settings.Index',
        'users.List',
        'users.Edit'
    ],
    
    /*
     * The default is already true, I'm just making it clear here that we
     * have one config called enableRouter that auto-invoke Ext.ux.Router.init();
     * If you need to customize when init() is called, set this to false
     */
    enableRouter: true,
    
    /*
     * Here is where routes are defined.
     *  key:    URL matcher
     *  value:  controller + '#' + action to be invoked
     */
    routes: {
        '/'             : 'home#index',
        'settings'      : 'settings#index',
        'users'         : 'users#list',
        'users/:id/edit': 'users#edit'
    },
    
    launch: function() {
        /* 
         * Ext.ux.Router provides some events for better controlling
         * dispatch flow
         */
        Ext.ux.Router.on({
            
            routemissed: function(token) {
                Ext.Msg.show({
                    title:'Error 404',
                    msg: 'Route not found: ' + token,
                    buttons: Ext.Msg.OK,
                    icon: Ext.Msg.ERROR
                });
            },
            
            beforedispatch: function(token, match, params) {
                console.log('beforedispatch ' + token);
            },
            
            /**
             * For this example I'm using the dispatch event to render the view
             * based on the token. Each route points to a controller and action. 
             * Here I'm using these 2 information to get the view and render.
             */
            dispatch: function(token, match, params, controller) {
                var view, viewClass, action,
                    viewport    = Ext.getCmp('viewport'),
                    target      = viewport.down('#viewport-target'),
                    navToolbar  = viewport.down('#main-nav-toolbar');
                    
                // adjust controller and action names    
                action      = Ext.String.capitalize(match.action);
                controller  = match.controller.charAt(0).toLowerCase() + match.controller.substr(1);
                
                // try to get the view by controller + action names
                viewClass   = Ext.ClassManager.get('App.view.' + controller + '.' + action);
                
                if (viewClass) {
                    
                    // create view
                    view = Ext.create(viewClass);
                    
                    // clear target and add new view
                    target.removeAll();
                    target.add(view);
                    
                    // adjust top toolbar
                    if (navToolbar.child('#' + controller)) {
                        navToolbar.child('#' + controller).toggle(true);
                    }
                }
            }
        });
    }
});