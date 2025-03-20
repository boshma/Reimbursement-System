const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { isManager } = require('../middleware/roleCheck');
const upload = require('../middleware/multerUpload');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/profile', auth, authController.getProfile);
router.patch('/profile', auth, authController.updateProfile);
router.patch('/users/:userId/role', [auth, isManager], authController.updateUserRole);
router.patch(
    '/profile/picture', 
    [auth, upload.single('profilePicture')], 
    authController.updateProfilePicture
);

module.exports = router;