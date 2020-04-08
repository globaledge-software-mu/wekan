Meteor.publish('team_members_scores', function() {
  return TeamMembersScores.find();
});
