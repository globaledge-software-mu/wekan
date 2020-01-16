Meteor.publish('assigned_user_groups', function() {
  return AssignedUserGroups.find();
});
