BlazeComponent.extendComponent({
  onCreated() {
    this.error = new ReactiveVar('');
    this.loading = new ReactiveVar(false);
    this.generalSetting = new ReactiveVar(true);
    this.emailSetting = new ReactiveVar(false);
    this.accountSetting = new ReactiveVar(false);
    this.announcementSetting = new ReactiveVar(false);
    this.layoutSetting = new ReactiveVar(false);

    Meteor.subscribe('setting');
    Meteor.subscribe('mailServer');
    Meteor.subscribe('accountSettings');
    Meteor.subscribe('announcements');
  },

  setError(error) {
    this.error.set(error);
  },

  setLoading(w) {
    this.loading.set(w);
  },

  checkField(selector) {
    const value = $(selector).val();
    if (!value || value.trim() === '') {
      $(selector).parents('li.smtp-form').addClass('has-error');
      throw Error('blank field');
    } else {
      return value;
    }
  },

  currentSetting() {
    return Settings.findOne();
  },

  boards() {
    return Boards.find({
      archived: false,
      'members.userId': Meteor.userId(),
      'members.isAdmin': true,
    }, {
      sort: ['title'],
    });
  },

  roles() {
    return Roles.find({});
  },

  coachOrCoacheeRoles() {
    return Roles.find({
      $or: [{ name: 'Coach' }, { name: 'Coachee' }]
    });
  },

  toggleRegistration() {
    this.setLoading(true);
    const registrationClosed = this.currentSetting().disableRegistration;
    Settings.update(Settings.findOne()._id, {$set: {disableRegistration: !registrationClosed}});
    this.setLoading(false);
    if (registrationClosed) {
      $('.invite-people').slideUp();
    } else {
      $('.invite-people').slideDown();
    }
  },
  toggleTLS() {
    $('#mail-server-tls').toggleClass('is-checked');
  },
  toggleHideLogo() {
    $('#hide-logo').toggleClass('is-checked');
  },
  toggleDisplayAuthenticationMethod() {
    $('#display-authentication-method').toggleClass('is-checked');
  },
  switchMenu(event) {
    const target = $(event.target);
    if (!target.hasClass('active')) {
      $('.side-menu li.active').removeClass('active');
      target.parent().addClass('active');
      const targetID = target.data('id');
      this.generalSetting.set('registration-setting' === targetID);
      this.emailSetting.set('email-setting' === targetID);
      this.accountSetting.set('account-setting' === targetID);
      this.announcementSetting.set('announcement-setting' === targetID);
      this.layoutSetting.set('layout-setting' === targetID);
    }
  },

  checkBoard(event) {
    let target = $(event.target);
    if (!target.hasClass('js-toggle-board-choose')) {
      target = target.parent();
    }
    const checkboxId = target.attr('id');
    $(`#${checkboxId} .materialCheckBox`).toggleClass('is-checked');
    $(`#${checkboxId}`).toggleClass('is-checked');
  },

  inviteThroughEmail() {
    const emails = $('#email-to-invite').val().toLowerCase().trim().split('\n').join(',').split(',');
    const boardsToInvite = [];
    $('.js-toggle-board-choose .materialCheckBox.is-checked').each(function () {
      boardsToInvite.push($(this).data('id'));
    });
    const validEmails = [];
    emails.forEach((email) => {
      if (email && SimpleSchema.RegEx.Email.test(email.trim())) {
        validEmails.push(email.trim());
      }
    });
    const roleId = $('.js-profile-role').children("option:selected").val();
  	const roleName = null;
    const role = Roles.findOne({_id: roleId});
    if (role && role.name) {
    	roleName = role.name;
    }
    if (validEmails.length) {
      this.setLoading(true);
      // Call method to Invite User(s) to Board(s) 
//      Meteor.call('sendInvitation', validEmails, boardsToInvite, () => {
//        // if (!err) {
//        //   TODO - show more info to user
//        // }
//        this.setLoading(false);
//      });
      
      // Added the following logic to call the 'inviteUserToBoard' method from the model 'Users'
      // so that the system creates the user record and then an email to the user to complete its registration by just entering his password
      const self = this;

      validEmails.forEach((validEmail) => {
      	boardsToInvite.forEach((inviteToBoard) => {
          Meteor.call('inviteUserToBoard', validEmail, inviteToBoard, (err, ret) => {
            self.setLoading(false);
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
            } else if (ret.email) {
              Users.update(
            		{ _id: ret.userID }, 
            		{ $set: 
            			{ 'roleId': roleId, 'roleName': roleName },
            		}
          		);

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
            }
          });
      	});
      });
    }
  },

  saveMailServerInfo() {
    this.setLoading(true);
    $('li').removeClass('has-error');

    try {
      const host = this.checkField('#mail-server-host');
      const port = this.checkField('#mail-server-port');
      const username = $('#mail-server-username').val().trim();
      const password = $('#mail-server-password').val().trim();
      const from = this.checkField('#mail-server-from');
      const tls = $('#mail-server-tls.is-checked').length > 0;
      Settings.update(Settings.findOne()._id, {
        $set: {
          'mailServer.host': host, 'mailServer.port': port, 'mailServer.username': username,
          'mailServer.password': password, 'mailServer.enableTLS': tls, 'mailServer.from': from,
        },
      });
    } catch (e) {
      return;
    } finally {
      this.setLoading(false);
    }

  },

  saveLayout() {
    this.setLoading(true);
    $('li').removeClass('has-error');

    const productName = $('#product-name').val().trim();
    const hideLogoChange = ($('input[name=hideLogo]:checked').val() === 'true');
    const displayAuthenticationMethod = ($('input[name=displayAuthenticationMethod]:checked').val() === 'true');
    const defaultAuthenticationMethod = $('#defaultAuthenticationMethod').val();
    const customHTMLafterBodyStart = $('#customHTMLafterBodyStart').val().trim();
    const customHTMLbeforeBodyEnd = $('#customHTMLbeforeBodyEnd').val().trim();

    try {
      Settings.update(Settings.findOne()._id, {
        $set: {
          productName,
          hideLogo: hideLogoChange,
          customHTMLafterBodyStart,
          customHTMLbeforeBodyEnd,
          displayAuthenticationMethod,
          defaultAuthenticationMethod,
        },
      });
    } catch (e) {
      return;
    } finally {
      this.setLoading(false);
    }

    DocHead.setTitle(productName);

  },

  sendSMTPTestEmail() {
    Meteor.call('sendSMTPTestEmail', (err, ret) => {
      if (!err && ret) {
        const message = `${TAPi18n.__(ret.message)}: ${ret.email}`;
        alert(message);
      } else {
        const reason = err.reason || '';
        const message = `${TAPi18n.__(err.error)}\n${reason}`;
        alert(message);
      }
    });
  },

  events() {
    return [{
      'click a.js-toggle-registration': this.toggleRegistration,
      'click a.js-toggle-tls': this.toggleTLS,
      'click a.js-setting-menu': this.switchMenu,
      'click a.js-toggle-board-choose': this.checkBoard,
      'click button.js-email-invite'(evt) {
        evt.preventDefault();
      	$('.successStatus.inviteSent').remove();
      	$('.errorStatus.inviteNotSent').remove();
      	$('.select-role-msg').hide();
      	$('.select-board-msg').hide();
      	$('.enter-valid-email').hide();
        const emails = $('#email-to-invite').val().toLowerCase().trim().split('\n').join(',').split(',');
        const validEmails = [];
        emails.forEach((email) => {
          if (email && SimpleSchema.RegEx.Email.test(email.trim())) {
            validEmails.push(email.trim());
          }
        });
        var validEmailNotEntered = !validEmails.length;
      	var roleNotSelected = $('.select-role.js-profile-role option:selected').html() === 'Select One';
      	var boardNotSelected = !$('.materialCheckBox.is-checked').length; 
      	if (validEmailNotEntered && !boardNotSelected && !roleNotSelected) {
        	$('.enter-valid-email').show();
        } else if (!validEmailNotEntered && !boardNotSelected && roleNotSelected) {
        	$('.select-role-msg').show();
        } else if (!validEmailNotEntered && boardNotSelected && !roleNotSelected) {
        	$('.select-board-msg').show();
        } else if (validEmailNotEntered && !boardNotSelected && roleNotSelected) {
        	$('.enter-valid-email').show();
        	$('.select-role-msg').show();
        } else if (validEmailNotEntered && boardNotSelected && !roleNotSelected) {
        	$('.enter-valid-email').show();
        	$('.select-board-msg').show();
        } else if (!validEmailNotEntered && boardNotSelected && roleNotSelected) {
        	$('.select-role-msg').show();
        	$('.select-board-msg').show();
        } else if (validEmailNotEntered && boardNotSelected && roleNotSelected) {
        	$('.select-role-msg').show();
        	$('.select-board-msg').show();
        	$('.enter-valid-email').show();
        } else {
          this.inviteThroughEmail();
        }
      },
      'click button.js-save': this.saveMailServerInfo,
      'click button.js-send-smtp-test-email': this.sendSMTPTestEmail,
      'click a.js-toggle-hide-logo': this.toggleHideLogo,
      'click button.js-save-layout': this.saveLayout,
      'click a.js-toggle-display-authentication-method': this.toggleDisplayAuthenticationMethod,
    }];
  },
}).register('setting');

BlazeComponent.extendComponent({

  saveAccountsChange() {
    const allowEmailChange = ($('input[name=allowEmailChange]:checked').val() === 'true');
    const allowUserNameChange = ($('input[name=allowUserNameChange]:checked').val() === 'true');
    AccountSettings.update('accounts-allowEmailChange', {
      $set: {'booleanValue': allowEmailChange},
    });
    AccountSettings.update('accounts-allowUserNameChange', {
      $set: {'booleanValue': allowUserNameChange},
    });
  },

  allowEmailChange() {
    return AccountSettings.findOne('accounts-allowEmailChange').booleanValue;
  },
  allowUserNameChange() {
    return AccountSettings.findOne('accounts-allowUserNameChange').booleanValue;
  },

  events() {
    return [{
      'click button.js-accounts-save': this.saveAccountsChange,
    }];
  },
}).register('accountSettings');

BlazeComponent.extendComponent({
  onCreated() {
    this.loading = new ReactiveVar(false);
  },

  setLoading(w) {
    this.loading.set(w);
  },

  currentSetting() {
    return Announcements.findOne();
  },

  saveMessage() {
    const message = $('#admin-announcement').val().trim();
    Announcements.update(Announcements.findOne()._id, {
      $set: {'body': message},
    });
  },

  toggleActive() {
    this.setLoading(true);
    const isActive = this.currentSetting().enabled;
    Announcements.update(Announcements.findOne()._id, {
      $set: {'enabled': !isActive},
    });
    this.setLoading(false);
    if (isActive) {
      $('.admin-announcement').slideUp();
    } else {
      $('.admin-announcement').slideDown();
    }
  },

  events() {
    return [{
      'click a.js-toggle-activemessage': this.toggleActive,
      'click button.js-announcement-save': this.saveMessage,
    }];
  },
}).register('announcementSettings');


Template.selectAuthenticationMethod.onCreated(function() {
  this.authenticationMethods = new ReactiveVar([]);

  Meteor.call('getAuthenticationsEnabled', (_, result) => {
    if (result) {
      // TODO : add a management of different languages
      // (ex {value: ldap, text: TAPi18n.__('ldap', {}, T9n.getLanguage() || 'en')})
      this.authenticationMethods.set([
        {value: 'password'},
        // Gets only the authentication methods availables
        ...Object.entries(result).filter((e) => e[1]).map((e) => ({value: e[0]})),
      ]);
    }
  });
});

Template.selectAuthenticationMethod.helpers({
  authentications() {
    return Template.instance().authenticationMethods.get();
  },
  isSelected(match) {
    return Template.instance().data.authenticationMethod === match;
  },
});
