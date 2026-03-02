const auth = require('@react-native-firebase/auth');
console.log('Keys:', Object.keys(auth));
if (auth.default) {
    console.log('Default Keys:', Object.keys(auth.default()));
}
