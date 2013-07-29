/*
 * == Old Sencha Command (v <= 2)
 *
 * You need to specify the path for Ext.ux.Router here using Ext.Loader.setConfig
 *
 * Ext.Loader.setConfig({
 *     enabled: true,
 *     paths: {
 *         'Ext.ux.Router': '../../Router.js'
 *     }
 * });
 *
 * == New Sencha Command 3+
 *  
 * Add the path to your .sencha/app/sencha.cfg. Notice that .sencha folder is a hidden folder.
 *
 *      app.classpath=${app.dir}/app,${app.dir}/../../Router.js
 *
 * After that run "sencha app refresh" to refresh the dependencies on bootstrap.js.
 * Ext.ux.Router will be added over there and you can simply use it.
 */

Ext.application({
    name: 'Rendering',
    autoCreateViewport: true,

    requires: [
        'Ext.ux.Router' // Require the UX
    ],
    
    stores: [
        'Users'
    ],
    
    controllers: [
        'Home',
        'Settings',
        'Users'
    ],
    
    views: [
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
    }
});