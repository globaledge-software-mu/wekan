const usersPerPage = 25;

BlazeComponent.extendComponent({
  mixins() {
    return [Mixins.InfiniteScrolling];
  },
  onCreated() {
    this.error = new ReactiveVar('');
    this.loading = new ReactiveVar(false);
    this.people = new ReactiveVar(true);
    this.roles = new ReactiveVar(false);
    this.userGroups = new ReactiveVar(false);
    this.findUsersOptions = new ReactiveVar({});
    this.findRolesOptions = new ReactiveVar({});
    this.number = new ReactiveVar(0);

    this.page = new ReactiveVar(1);
    this.loadNextPageLocked = false;
    this.callFirstWith(null, 'resetNextPeak');
    this.autorun(() => {
      const limit = this.page.get() * usersPerPage;

      this.subscribe('people', limit, () => {
        this.loadNextPageLocked = false;
        const nextPeakBefore = this.callFirstWith(null, 'getNextPeak');
        this.calculateNextPeak();
        const nextPeakAfter = this.callFirstWith(null, 'getNextPeak');
        if (nextPeakBefore === nextPeakAfter) {
          this.callFirstWith(null, 'resetNextPeak');
        }
      });
      this.subscribe('roles');
      Meteor.subscribe('users');
      Meteor.subscribe('role_colors');
      this.subscribe('user_groups');
    });
  },
  events() {
    return [{
      'click #searchButton'() {
        this.filterPeople();
      },
      'keydown #searchInput'(event) {
        if (event.keyCode === 13 && !event.shiftKey) {
          this.filterPeople();
        }
      },
    }];
  },
  filterPeople() {
    const value = $('#searchInput').first().val();
    if (value === '') {
      this.findUsersOptions.set({});
    } else {
      const regex = new RegExp(value, 'i');
      this.findUsersOptions.set({
        $or: [
          { username: regex },
          { 'profile.fullname': regex },
          { 'emails.address': regex },
        ],
      });
    }
  },
  loadNextPage() {
    if (this.loadNextPageLocked === false) {
      this.page.set(this.page.get() + 1);
      this.loadNextPageLocked = true;
    }
  },
  calculateNextPeak() {
    const element = this.find('.main-body');
    if (element) {
      const altitude = element.scrollHeight;
      this.callFirstWith(this, 'setNextPeak', altitude);
    }
  },
  reachNextPeak() {
    this.loadNextPage();
  },
  setError(error) {
    this.error.set(error);
  },
  setLoading(w) {
    this.loading.set(w);
  },
  peopleList() {
    const users = Users.find();
    this.number.set(users.count());
    return users;
  },
  managerUsersList() {
    const role = Roles.findOne({name: 'Manager'});
    const users = Users.find({
      $nor: [
        { isAdmin: true },
        { roleId: role._id }
      ]
    });
    this.number.set(users.count());
    return users;
  },
  coachUsersList() {
    const managerRole = Roles.findOne({name: 'Manager'});
    const coachRole = Roles.findOne({name: 'Coach'});
    if (managerRole && managerRole._id && coachRole && coachRole._id) {
      const users = Users.find({
        $nor: [
          { isAdmin: true },
          { roleId: managerRole._id },
          { roleId: coachRole._id }
        ]
      });
      this.number.set(users.count());
      return users;
    } else {
      this.number.set(0);
      return null;
    }
  },
  peopleNumber() {
    return this.number.get();
  },
  roleList() {
    const roles = Roles.find(this.findRolesOptions.get(), {
      sort: ['name'],
    });
    var count = roles.count();
    this.number.set(roles.count());
    return roles;
  },
  switchMenu(event) {
    const target = $(event.target);
    if (!target.hasClass('active')) {
      $('.side-menu li.active').removeClass('active');
      target.parent().addClass('active');
      const targetID = target.data('id');
      this.people.set('people-setting' === targetID);
      this.roles.set('roles-setting' === targetID);
      this.userGroups.set('user-groups-setting' === targetID);
    }
  },
  events() {
    return [{
      'click a.js-setting-menu': this.switchMenu,
      'click #create-user': Popup.open('createNewUser'),
    }];
  },
}).register('people');

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },
  
  onRendered() {
    this.setLoading(false);
  },
  
	setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },
  
  events() {
    return [{
    	submit(evt) {
        evt.preventDefault();
        const fullname = this.find('.js-profile-fullname').value.trim();
        const username = this.find('.js-profile-username').value.trim();
        const isAdmin = false;
        if (this.find('.js-profile-isadmin')) {
          isAdmin = this.find('.js-profile-isadmin').value.trim();
        }
        const roleId = this.find('.js-profile-role').value;
      	const roleName = null;
        const role = Roles.findOne({_id: roleId});
        if (role && role.name) {
        	roleName = role.name;
        }
        const email = this.find('.js-profile-email').value.trim().toLowerCase();
        const posAt = email.indexOf('@');
        let duplicateUserEmail = null;
        let duplicateUserName = null;
        if (posAt >= 0) {
          if (username.length < 1) {
            username = email.substring(0, posAt);
            this.$('.js-profile-username').text(username);
          }
          duplicateUserEmail = Users.findOne({emails: {$elemMatch: {address: email}}});
          duplicateUserName = Users.findOne({username});
        }

        var leftBlank = ['undefined', null, ''];
        var fullnameLeftBlank = leftBlank.indexOf(fullname) > -1;
        var usernameLeftBlank = leftBlank.indexOf(username) > -1;
        var roleNotSelected = leftBlank.indexOf(roleId) > -1;
        var validEmailNotEntered = posAt < 1;
        $('.user-not-created').hide();
        if (fullnameLeftBlank) {
        	this.$('.fullname-blank').show();
        }
        if (usernameLeftBlank) {
        	this.$('.username-blank').show();
        }
        if (roleNotSelected) {
        	this.$('.role-not-selected').show();
        }
        if (validEmailNotEntered) {
        	this.$('.valid-email-not-entered').show();
        }
        if (fullnameLeftBlank || usernameLeftBlank || roleNotSelected || validEmailNotEntered) {
          return false;
        }

        const usernameMessageElement = this.$('.username-taken');
        const emailMessageElement = this.$('.email-taken');
        
        if (duplicateUserEmail && duplicateUserName) {
          usernameMessageElement.show();
          emailMessageElement.show();
        } else if (duplicateUserName) {
          usernameMessageElement.show();
        } else if (duplicateUserEmail) {
          emailMessageElement.show();
        } else {
          this.setLoading(true);
        	const params = {};
        	params['username'] = username;
        	params['email'] = email;
        	params['isAdmin'] = isAdmin;
        	params['fullname'] = fullname;
        	params['roleId'] = roleId;
        	params['roleName'] = roleName;
          // Create user doc
          Meteor.call('createNewUser', params, (err, res) => {
          	this.setLoading(false);
            if (err) {
            	var message = '';
            	if (err.error) {
              	message = TAPi18n.__(err.error);
            	} else {
              	message = TAPi18n.__(err);
              	if (message == null || message == '' || typeof message === 'undefined' || message.length < 1) {
              		message = err;
              		if (typeof err === 'object') {
              			message = JSON.stringify(err);
              		}
              	}
            	}
              var $errorMessage = $('<div class="errorStatus inviteNotSent"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
              $('#header-main-bar').before($errorMessage);
              $errorMessage.delay(10000).slideUp(500, function() {
                $(this).remove();
              });
            } else if (res) {
            	var message1 = TAPi18n.__('user-created');
            	var message2 = TAPi18n.__('invite-sent');
              var $successMessage = $('<div class="successStatus inviteSent"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+
            		message1 + ' & ' + message2 +
            		'</b></p></div>'
          		);
              $('#header-main-bar').before($successMessage);
              $successMessage.delay(10000).slideUp(500, function() {
                $(this).remove();
              });
              Popup.close();
            }
          });
        };
      },

      'click #cancelButton'() {
        Popup.close();
      },
    }];
  },
}).register('createNewUserPopup');

Template.peopleRow.helpers({
  userData() {
    const userCollection = this.esSearch ? ESSearchResults : Users;
    return userCollection.findOne(this.userId);
  },
  roleName() {
    const userCollection = this.esSearch ? ESSearchResults : Users;
    let user = userCollection.findOne(this.userId);
    if (!user.roleId) {
      return '-';
    }
    let role = Roles.findOne(user.roleId);
    return role.name;
  }
});

Template.roleRow.helpers({
  roleData() {
    return Roles.findOne(this.roleId);
  },
});

BlazeComponent.extendComponent({
  onCreated() {
  },
  user() {
    return Users.findOne(this.userId);
  },
  events() {
    return [{
      'click a.edit-user': Popup.open('editUser'),
    }];
  },
}).register('peopleRow');

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },
  
  onRendered() {
    this.setLoading(false);
  },
  
	setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },

  events() {
    return [{
      submit(evt) {
        evt.preventDefault();
      	$('#editUserPopup').find('.errorStatus').remove();
        const user_id = Template.instance().data.userId;
        const user = Users.findOne(user_id);
        const fullname = this.find('.js-profile-fullname').value.trim();
        const username = this.find('.js-profile-username').value.trim();
        const password = this.find('.js-profile-password').value;
        const isAdmin = this.find('.js-profile-isadmin').value.trim();
        const roleId = this.find('.js-profile-role').value;
      	const roleName = null;
        const role = Roles.findOne({_id: roleId});
        if (role && role.name) {
        	roleName = role.name;
        }
        const isActive = this.find('.js-profile-isactive').value.trim();
        const email = this.find('.js-profile-email').value.trim();

        const isChangePassword = password.length > 0;
        const isChangeUserName = username !== user.username;
        const isChangeEmail = email.toLowerCase() !== user.emails[0].address.toLowerCase();

        this.setLoading(true);

        Users.update(user_id, {
          $set: {
            'profile.fullname': fullname,
            'isAdmin': isAdmin === 'true',
            'roleId': roleId,
            'roleName': roleName,
            'loginDisabled': isActive === 'true',
          },
        }, (err, res) => {
        	this.setLoading(false);
          if (err) {
          	var message = '';
          	if (err.error) {
            	message = TAPi18n.__(err.error);
          	} else {
            	message = err;
          	}
            var $errorMessage = $('<div class="errorStatus" style="padding: 0px; margin: 0px 20px 0px 20px"><p><b>'+message+'</b></p></div>');
            $('#editUserPopup').prepend($errorMessage);
          } else if (res) {
            this.$('.username-taken').hide();
            this.$('.email-taken').hide();

            if (isChangePassword) {
              Meteor.call('setPassword', password, user_id);
            }

            function displayEditUserSuccessMsg() {
            	var message = TAPi18n.__('edit-user-successful');
              var $successMessage = $('<div class="successStatus"><a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a><p><b>'+message+'</b></p></div>');
              $('#header-main-bar').before($successMessage);
              $successMessage.delay(10000).slideUp(500, function() {
                $(this).remove();
              });
              Popup.close();
            };

            if (isChangeUserName && isChangeEmail) {
              Meteor.call('setUsernameAndEmail', username, email.toLowerCase(), user_id, function (error) {
                if (error) {
                  const errorElement = error.error;
                  if (errorElement === 'username-already-taken') {
                  	this.$('.username-taken').show();
                  } 
                  if (errorElement === 'email-already-taken') {
                  	this.$('.email-taken').show();
                  }
                } else {
                  displayEditUserSuccessMsg();
                }
              });
            } else if (isChangeUserName && !isChangeEmail) {
              Meteor.call('setUsername', username, user_id, function (error) {
                if (error) {
                  const errorElement = error.error;
                  if (errorElement === 'username-already-taken') {
                  	this.$('.username-taken').show();
                  }
                } else {
                  displayEditUserSuccessMsg();
                }
              });
            } else if (!isChangeUserName && isChangeEmail) {
              Meteor.call('setEmail', email.toLowerCase(), user_id, function (error) {
                if (error) {
                  const errorElement = error.error;
                  if (errorElement === 'email-already-taken') {
                  	this.$('.email-taken').show();
                  }
                } else {
                  displayEditUserSuccessMsg();
                }
              });
            } else {
              displayEditUserSuccessMsg();
            }
          }
        });
      },

      'click #deleteButton'() {
      	const oldUserId = Template.instance().data.userId;
        Users.remove(oldUserId);
        // Cleanup Boards of this specific no-longer-existing user as a member
        Boards.find({
        	archived: false,
        	'members.userId': oldUserId,
      	}).forEach((board) => {
    			Boards.update(
    				{ _id: board._id }, 
    				{ $pull: {
    					members: {
    						userId: oldUserId
    					}
    				} }
    			);
      	});
        Popup.close();
      },
    }];
  },
}).register('editUserPopup');

Template.editUserPopup.helpers({
	user() {
	  return Users.findOne(this.userId);
	},

	isSelected(match) {
	  const userId = Template.instance().data.userId;
	  const selected = Users.findOne(userId).authenticationMethod;
	  return selected === match;
	},

	isLdap() {
	  const userId = Template.instance().data.userId;
	  const selected = Users.findOne(userId).authenticationMethod;
	  return selected === 'ldap';
	},
});

Template.roleOptions.helpers({
  currentRole(match) {
    const userId = Template.instance().data.userId;
    if (userId) {
      const selected = Users.findOne(userId).roleId;
      return selected === match;
    }
    return false;
  },
  roles() {
    return Roles.find({});
  },
  coachOrCoacheeRoles() {
    return Roles.find({
      $or: [{ name: 'Coach' }, { name: 'Coachee' }]
    });
  },
  coacheeRole() {
    return Roles.findOne({ name: 'Coachee' });
  },
});

BlazeComponent.extendComponent({
  onCreated() {
  },
  roles() {
    return Roles.find({}, {
      sort: ['name']
    });
  },
  events() {
    return [{
      'click button.js-open-create-role': Popup.open('createRole'),
    }];
  },
}).register('rolesGeneral');

BlazeComponent.extendComponent({
  onCreated() {
  },
  events() {
    return [{
      'click a.edit-role': Popup.open('createRole'),
    }];
  },
}).register('roleRow');


Template.createRolePopup.events({
  submit(evt, tpl) {
    evt.preventDefault();
    let permissions = [];
    tpl.$('.js-permission.is-checked').each(function(id, elem) {
      let group = $(elem).parents('tr').data('group');
      let access = $(elem).data('access');
      permissions.push({group:group, access:access});
    });
    const name = tpl.find('.js-role-name').value.trim();
    const colour = tpl.$('.fa-check').closest('.palette-color.js-palette-color').data('color');

    // insert or update
    if (!this.roleId) {
      const newRoleId = Roles.insert({
        'name': name,
        'permissions': permissions,
      });
      if (colour) {
      	RoleColors.insert({
      		roleId: newRoleId, 
      		color: colour, 
      		roleName: name
      	});
      }
    } else {
      Roles.update(this.roleId, {
        $set: {
          'name': name,
          'permissions': permissions,
        },
      });
      if (colour) {
      	const roleColor = RoleColors.findOne({ roleId: this.roleId });
      	if (roleColor && roleColor._id) {
      		RoleColors.update(
      			{ _id: roleColor._id }, 
      			{ $set: 
      				{  color: colour, roleName: name } 
      			}
    			);
      	} else {
        	RoleColors.insert({
        		roleId: this.roleId, 
        		color: colour, 
        		roleName: name
        	});
      	}
      }
    }

    Popup.close();
  },

  'click .palette-color.js-palette-color'(e) {
  	if (!$(e.target).hasClass('fa-check')) {
    	var colorsSelector = $('.palette-color.js-palette-color');
    	colorsSelector.children().remove();
    	colorsSelector.css({'padding-left':'8px', 'padding-right':'8px'});
    	$(e.currentTarget).append('<i class="fa fa-check"></i>');
    	$(e.currentTarget).css({'padding-left':'5px', 'padding-right':'5px'});
  	}
  },

  'click .js-permission'(evt) {
    let $target = $(evt.target);
    if(!$target.hasClass('js-permission')){
      $target = $target.parent();
    }
    $target.find('.materialCheckBox').toggleClass('is-checked');
    $target.toggleClass('is-checked');
  },

  'click #deleteButton'() {
    Roles.remove(this.roleId);
    Popup.close();
  },
});
Template.createRolePopup.helpers({
  isEnabled(role, group, access) {
    if (!role) {
      return false;
    }
    for (var i in role.permissions) {
      if (role.permissions[i].group == group && role.permissions[i].access == access)
        return true;
    }
    return false;
  },
  groups() {
    return Roles.groups;
  },
  role() {
    return Roles.findOne(this.roleId);
  },
  managerCoachOrCoacheeDoc(id) {
  	var role = Roles.findOne({ 
  		_id: id, 
  		name: { 
  			$in: ['Manager', 'Coach', 'Coachee'] 
  		} 
  	});

  	if (role) {
  		return true;
  	}
  	return false;
  },
  colors() {
  	return [ 
  		'green', 'yellow', 'orange', 'red', 
  		'purple', 'blue', 'sky', 'lime', 
  		'pink', 'peachpuff', 'crimson', 'plum', 
  		'darkgreen', 'slateblue', 'magenta', 'gold', 
  		'navy', 'saddlebrown', 'paleturquoise', 'indigo' 
  	];
  },
  isSelected(id, colour) {
  	const roleColor = RoleColors.findOne({
  		roleId: { $exists: true, $eq: id },
  		color: colour 
  	});
  	if (roleColor) {
  		return true;
  	}
  	return false;
  },
});
  
BlazeComponent.extendComponent({
  userGroupsList() {
  	return UserGroups.find();
  },
  events() {
	  return [{
	    'click button#create-user-group': Popup.open('createUserGroup'),
	  }];
	}
}).register('userGroupsGeneral');

BlazeComponent.extendComponent({
	userGroup() {
    return UserGroups.findOne(this.userGroupId);
  },
  events() {
	  return [{
	   'click a.edit-user-group': Popup.open('editUserGroup'),
	  }];
	}
}).register('userGroupRow');

Template.userGroupRow.helpers({
	userGroupData() {
    return UserGroups.findOne(this.userGroupId);
  },
});

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },
  
  onRendered() {
    this.setLoading(false);
  },
  
	setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },
  
  events() {
    return [{
    	submit(evt) {
        evt.preventDefault();
        const title = this.find('.js-user-group-title').value.trim();
        const quota = this.find('.js-user-group-quota').value.trim();
        const resource = this.find('.js-user-group-resource').value.trim();
        const category = this.find('.js-user-group-category').value.trim();
        
        //
      },

      'click #cancelUserGroupCreation'() {
        Popup.close();
      },
    }];
  },
}).register('createUserGroupPopup');

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },
  
  onRendered() {
    this.setLoading(false);
  },
  
	setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },

  events() {
    return [{
      submit(evt) {
        evt.preventDefault();
      	$('#editUserGroupPopup').find('.errorStatus').remove();
        const userGroupId = Template.instance().data.userGroupId;
      	//
      },

      'click #deleteButton'() {
      	//
        Popup.close();
      },
    }];
  },
}).register('editUserGroupPopup');
