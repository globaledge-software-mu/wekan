Template.connectionMethod.onCreated(function() {
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

    // If only the default authentication available, hides the select boxe
    const content = $('.at-form-authentication');
    if (!(this.authenticationMethods.get().length > 1)) {
      content.hide();
    } else {
      content.show();
    }
  });
});

Template.connectionMethod.onRendered(() => {
  // Moves the select boxe in the first place of the at-pwd-form div
  $('.at-form-authentication').detach().prependTo('.at-pwd-form');
  $('.at-form-authentication').addClass('hide');
  $('.at-oauth').remove();
  $('.at-sep').remove();

  // Added the following part because Louis wanted the email address of the new user to be shown too when he is about to set up his password
  if ($('#at-field-username_and_email').length < 1) {
    $('.at-title').text('Set Your Password');
    var token = window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
    Meteor.call('getEnrollingUserEmail', token, (_, result) => {
      if (result) {
        var htmlElem = `<div class="at-input">
          <label for="new_user_email">
            Email
          </label>
          <input type="text" id="new_user_email" name="new_user_email" value=" ` +  result + ` " disabled style="display: block;">
        </div>`;

        $('#at-pwd-form').prepend(htmlElem);
      }
    });
  }
});

Template.connectionMethod.helpers({
  authentications() {
    return Template.instance().authenticationMethods.get();
  },
  isSelected(match) {
    return Template.instance().data.authenticationMethod === match;
  },
});
