Ext.Loader.setConfig({
    enabled: true
});

Ext.application({
    name: 'AM',
    autoCreateViewport: true,
    paths: {
        'Ext.ux': 'app/ux'
    },
    requires: [
        'Ext.ux.Router'
    ],
    controllers: [
        'Home',
        'Users'
    ],

    /*
     * The default is already true, I'm just making it clear here that we
     * have one config called enableRouter that auto-invoke Ext.ux.Router.init();
     */
    enableRouter: true,

    /*
     * Here is where routes are defined.
     *  key:    URL matcher
     *  value:  controller + '#' + action to be invoked
     */
    routes: {
        '/': 'home#index',
        'users': 'users#list',
        'users/:id/edit': 'users#edit'
    },

    launch: function()
    {
        /* 
         * Override Ext.app.Controller to provide render capability. I believe each application
         * will handle rendering task different (some will render into a viewport, some in tabs, etc...), 
         * so I didn't put this role into Ext.ux.Route responsability.
         */
        Ext.override(Ext.app.Controller, {
            render: function(view)
            {
                //take viewport
                var tab, target = Ext.getCmp('main_tabpanel');
                
                //load view
                if (Ext.isString(view)) {
                    view = this.getView(view);
                }
                
                //if it already exists, remove
                tab = target.child(view.xtype);
                if(tab){
                    target.remove(tab);
                }    
                
                //add to viewport
                target.setActiveTab(target.add(view));
            }
        });

        /* 
         * Ext.ux.Router provides some events for better controlling
         * dispatch flow
         */
        Ext.ux.Router.on({
            routemissed: function(uri)
            {
                Ext.Msg.show({
                    title:'Error 404',
                    msg: 'Route not found: ' + uri,
                    buttons: Ext.Msg.OK,
                    icon: Ext.Msg.ERROR
                });
            },
            beforedispatch: function(uri, match, params)
            {
                console.log('beforedispatch ' + uri);
            },
            dispatch: function(uri, match, params, controller)
            {
                console.log('dispatch ' + uri);
                //TIP: you could automize rendering task here, inside dispatch event
            }
        });
    }
});