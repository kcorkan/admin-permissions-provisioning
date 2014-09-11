Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    PREF_NAME: 'permissions.provisioning.projecttree',
    USER_PREF_NAME: 'permissions.provisioning.user',
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        this.down('#display_box').add({
            itemId: 'button_build_projects',
            xtype: 'button',
            text: 'Refresh Projects',
            scope: this,
            margin: 10,
            handler: this._refreshProjectTreePreferences
        });
        
        this._createPendingPermissionsGrid();
    },
    _getRequestedPermissionColumns: function(){
        this.logger.log('_getRequestedPermissionColumns');
       
        var columns = [{ //username
                text: 'UserName',
                dataIndex: 'username',
                renderer: function(value, metaData, record){
                    return '<a href="/slm/user/edit.sp?oid=' + record.get('userid') + '" target="_blank">' + value + '</a>'; 
                } 
            },{//project 
                text: 'Project Path',
                dataIndex: 'projectpath',
                flex: 1
            },{//Permission
                dataIndex: 'permission',
                text: 'Requested Permission',
            },{ //Action Column (dismiss)
                        xtype:'actioncolumn',
                        width:50,
                        icon: '/slm/images/icon_delete.gif',
                        tooltip: 'dismiss',
                        handler: this._dismissRequest,
            }];
        return columns;        
    },
    _dismissRequest: function(tree, row_index, col_index){
        alert('dismiss request');
        //delete request
        //remove from grid
    },
       _createPendingPermissionsGrid: function(){
        this._createPendingPermissionsStore().then({
            scope: this,
            success: function(store){
                console.log('store:', store);
                this.down('#display_box').add({
                    xtype:'gridpanel',
                    itemId: 'requested-permissions-grid',
                    store: store,
                    columns: this._getRequestedPermissionColumns()
                });
                console.log('here');
            },
            failure: function(error){
                alert(error);
            }
        });
    },
    _createPendingPermissionsStore: function(){
        var workspace = this.getContext().getWorkspace();
        var deferred = Ext.create('Deft.Deferred');
        
        Rally.technicalservices.util.PreferenceSaving.fetchFromJSON(Rally.technicalservices.TSRequestedPermission.PREF_PREFIX_USER,workspace).then({
            scope: this,
            success: function(obj){
                var requests = obj[0].getKeys();
                var data = [];
                Ext.each(requests, function(req_key){
                   if (Rally.technicalservices.TSRequestedPermission.isValidPrefKey(req_key)){
                       data.push(obj[0].get(req_key));
                   }
                }, this);
                var store = Ext.create('Ext.data.Store',{
                    model: 'Rally.technicalservices.TSRequestedPermission',
                    data: data
                });
                deferred.resolve(store);
            
            },
            failure: function(error){
                deferred.reject(error);
                console.log(error);
            }
        });
        return deferred.promise; 
    },
    _refreshProjectTreePreferences: function(){
        var me = this; 
        this.down('#button_build_projects').setDisabled(true);
        var workspace = this.getContext().getWorkspace();
        this._fetchProjectTree().then({
            scope: this,
            success: function(tree){
                console.log(tree);
                Rally.technicalservices.util.PreferenceSaving.saveAsJSON(this.PREF_NAME,tree,workspace);
                Rally.ui.notify.Notifier.show({message: 'Project Tree Saved.'});
            },
            failure: function(error){
                Rally.ui.notify.Notifier.showError({message: error});
           }
        }).always(function(){
            me.down('#button_build_projects').setDisabled(false);
        });
         
    },
    _fetchProjectTree: function(){
        var deferred = Ext.create('Deft.Deferred');
        
        var store = Ext.create('Rally.data.wsapi.Store',{
            model: 'Project',
            fetch: ['Name','ObjectID','Parent','Children','Owner','User.Email'],
            limit: Infinity,
            autoLoad: true,
            context: {project: null},
            listeners: {
                scope: this, 
                load: function(store, records, successful){
                    console.log('load',successful);
                    if (successful){
                        
                        var fields = ['Name','Owner'];
                        var flattened_project_hash = this._createProjectModelHash(records);  
                        var project_tree = Rally.technicalservices.util.TreeBuilding.constructRootItems(flattened_project_hash);
                        var project_tree_hash = Rally.technicalservices.util.TreeBuilding.convertModelsToHashesLimitFields(project_tree, fields);
                        deferred.resolve(project_tree_hash);
                    } else {
                        deferred.reject('Error loading projects');
                    }

                }
            }
       });
       return deferred.promise;
    },
    _createProjectModelHash: function(records){
        var project_hash = {};
        Ext.Array.each(records, function(rec){
            var parent = rec.get('Parent');
            rec.set('parent',parent);
            project_hash[rec.get('ObjectID')] = rec;
            //TODO : deal with getting owner
            //var owner = rec.get('Owner.Email');
            //rec.set('Owner',owner);
         }, this);
        console.log(project_hash);
        return project_hash;
    }    
    

});