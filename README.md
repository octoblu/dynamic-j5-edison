# dynamic-j5-edison
Dynamically Generate a Johnny-Five plugin through device options.


##Setup - (this will be written way better tommorow)

1. Make sure your edison has the latest image installed.
2. Pull up the edison on a serial terminal ( OSX: "screen /dev/tty.usbSerialwhatever 115200 -L")
3. Type "configure_edison --wifi" and hit enter, follow through to configure wifi.
4. "cd /node_app_slot"
5. "npm install dynamic-j5-edison"
6. "reboot"
7. Go to app.octoblu.com and claim an edison device.
8. If the device doesn't show as discoverable type "cat /node_app_slot/meshblu.json" and hit enter to see the device UUID/TOKEN

The below gives a jist of how this is all used.



Add components from the device options page.
Any control based component you add will appear in the message schema by the name you give it.
You can add non-basic IO objects like a servo attached via an i2C interface.
Any sensor components you add will automatically send in a payload with a key based on the name you gave it. 2 messages every second.

Essentially, define your device's abilities and pin configuration in options, and in the designer you can control it using function names from a drop down that make sense to you!

![alt text](https://raw.githubusercontent.com/octoblu/dynamic-j5-edison/master/imgs/1.png "Logo Title Text 1")
![alt text](https://raw.githubusercontent.com/octoblu/dynamic-j5-edison/master/imgs/4.png "Logo Title Text 1")

![alt text](https://raw.githubusercontent.com/octoblu/dynamic-j5-edison/master/imgs/2.png "Logo Title Text 1")
![alt text](https://raw.githubusercontent.com/octoblu/dynamic-j5-edison/master/imgs/3.png "Logo Title Text 1")
