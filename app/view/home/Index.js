Ext.define('AM.view.home.Index' ,{
    extend: 'Ext.panel.Panel',
    alias : 'widget.homeIndex',
    
//config options
    title: 'Home',
    padding: '10px',
    html: [
        '<ul>',
            '<li> - Define <b>routes</b> config into application definition. See <a href="app.js">app.js</a>.</li>',
            '<li> - Create actions in your controllers according to routes. See <a href="app/controller/Home.js">Home.js</a> and <a href="app/controller/Users.js">Users.js</a> controllers files.</li>',
        '</ul>',
        '<p style="margin-top:10px;">Ext.ux.Router is a very lightweight utility and doesn\'t handle rendering process. It only parses URI Tokens and dispatch controller\'s action. Rendering ',
        ' is a very specific task from each app, and would add some complexity in order to attend different scenarios. See <a href="app.js">app.js</a> where an example is given on how to handle rendering', 
        ' by overriding Ext.Controller and creating a render() method.</p>',
        '<p style="margin-top:10px;">Source code and more docs available at <a href="https://github.com/brunotavares/Ext.ux.Router">https://github.com/brunotavares/Ext.ux.Router</a></p>'
    ].join('')
});