BlazeLayout.setRoot('body');

const i18nTagToT9n = (i18nTag) => {
  // t9n/i18n tags are same now, see: https://github.com/softwarerero/meteor-accounts-t9n/pull/129
  // but we keep this conversion function here, to be aware that that they are different system.
  return i18nTag;
};

const validator = {
  set(obj, prop, value) {
    if (prop === 'state' && value !== 'signIn') {
      $('.at-form-authentication').hide();
    } else if (prop === 'state' && value === 'signIn') {
      $('.at-form-authentication').show();
    }
    // The default behavior to store the value
    obj[prop] = value;
    // Indicate success
    return true;
  },
};

Template.userFormsLayout.onCreated(function() {
  const instance = this;
  instance.currentSetting = new ReactiveVar();
  instance.isLoading = new ReactiveVar(false);

  Meteor.subscribe('setting', {
    onReady() {
      instance.currentSetting.set(Settings.findOne());
      return this.stop();
    },
  });
});

Template.userFormsLayout.onRendered(() => {
  AccountsTemplates.state.form.keys = new Proxy(AccountsTemplates.state.form.keys, validator);

  const i18nTag = navigator.language;
  // Setting the default language nl at set password for new user
  if (FlowRouter.getRouteName() === 'atEnrollAccount') {
    T9n.setLanguage(i18nTagToT9n('nl'));
  } else if (i18nTag) {
    T9n.setLanguage(i18nTagToT9n(i18nTag));
  }

  EscapeActions.executeAll();
});

Template.userFormsLayout.helpers({
  currentSetting() {
    return Template.instance().currentSetting.get();
  },

  isLoading() {
    return Template.instance().isLoading.get();
  },

  afterBodyStart() {
    return currentSetting.customHTMLafterBodyStart;
  },

  beforeBodyEnd() {
    return currentSetting.customHTMLbeforeBodyEnd;
  },

  languages() {
    return _.map(TAPi18n.getLanguages(), (lang, code) => {
      const tag = code;
      let name = lang.name;
      if (lang.name === 'br') {
        name = 'Brezhoneg';
      } else if (lang.name === 'ig') {
        name = 'Igbo';
      } else if (lang.name === 'oc') {
        name = 'Occitan';
      }
      return { tag, name };
    }).sort(function(a, b) {
      if (a.name === b.name) {
        return 0;
      } else {
        return a.name > b.name ? 1 : -1;
      }
    });
  },

  isCurrentLanguage() {
    const t9nTag = i18nTagToT9n(this.tag);
    const curLang = T9n.getLanguage() || 'nl';

    return t9nTag === curLang;
  },

  isNewUserSetPassword() {
    if (FlowRouter.getRouteName() === 'atEnrollAccount') {
      return true;
    } else {
      return false;
    }
  },

  isDefaultLanguage() {
    const t9nTag = i18nTagToT9n(this.tag);
    const curLang = 'nl';

    return t9nTag === curLang;
  },
});

Template.userFormsLayout.events({
  'change .js-userform-set-language'(evt) {
    const i18nTag = $(evt.currentTarget).val();
    T9n.setLanguage(i18nTagToT9n(i18nTag));
    evt.preventDefault();
  },
  'click #at-btn'(event, instance) {
    if (FlowRouter.getRouteName() === 'atSignIn') {
      const username = $('#at-field-username_and_email').val() == null ? $('#at-field-email').val(): $('#at-field-username_and_email').val();
      const lang = $('.js-userform-set-language').val();
      Meteor.call('setLanguageExistingUser', username, lang);
      instance.isLoading.set(true);
      authentication(event, instance);
    } else if (FlowRouter.getRouteName() === 'atEnrollAccount') {
      const token = window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
      const lang = $('.js-userform-set-language').val();
      Meteor.call('setLanguageNewUser', token, lang);
    }
  },
});

Template.defaultLayout.events({
  'click .js-close-modal': () => {
    Modal.close();
  },
});

async function authentication(event, instance) {
  const match = $('#at-field-username_and_email').val();
  const password = $('#at-field-password').val();

  if (!match || !password) {
    instance.isLoading.set(false);
    return undefined;
  }

  const result = await getAuthenticationMethod(instance.currentSetting.get(), match);

  if (result === 'password') {
    instance.isLoading.set(false);
    return undefined;
  }

  // Stop submit #at-pwd-form
  event.preventDefault();
  event.stopImmediatePropagation();

  switch (result) {
  case 'ldap':
    return new Promise((resolve) => {
      Meteor.loginWithLDAP(match, password, function() {
        resolve(FlowRouter.go('/'));
      });
    });

  case 'cas':
    return new Promise((resolve) => {
      Meteor.loginWithCas(match, password, function() {
        resolve(FlowRouter.go('/'));
      });
    });

  default:
    return undefined;
  }
}

function getAuthenticationMethod({displayAuthenticationMethod, defaultAuthenticationMethod}, match) {
  if (displayAuthenticationMethod) {
    return $('.select-authentication').val();
  }
  return getUserAuthenticationMethod(defaultAuthenticationMethod, match);
}

function getUserAuthenticationMethod(defaultAuthenticationMethod, match) {
  return new Promise((resolve) => {
    try {
      Meteor.subscribe('user-authenticationMethod', match, {
        onReady() {
          const user = Users.findOne();

          const authenticationMethod = user
            ? user.authenticationMethod
            : defaultAuthenticationMethod;

          resolve(authenticationMethod);
        },
      });
    } catch(error) {
      resolve(defaultAuthenticationMethod);
    }
  });
}
