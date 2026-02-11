ALTER TABLE profiles DISABLE TRIGGER prevent_profile_privilege_escalation;

UPDATE profiles SET approved = true WHERE id = '1a6279cd-aacf-42c1-a2ab-21fa60b9e8ea';

INSERT INTO user_roles (user_id, role)
VALUES ('1a6279cd-aacf-42c1-a2ab-21fa60b9e8ea', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE profiles ENABLE TRIGGER prevent_profile_privilege_escalation;