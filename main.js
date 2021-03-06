// Example based on Johnny-Five: https://github.com/rwaldron/johnny-five/wiki/Servo


var meshblu = require("meshblu");
var meshbluJSON = require("./meshblu.json");
var fs = require("fs");
var _ = require("underscore");
var five = require("johnny-five");
var intel = require("galileo-io");
var Oled = require('oled-js');
var font = require('oled-font-5x7');
var debug = require('debug')('dynamic');
var names = [];
var component = {};
var functions = [];
var read = {};
var components;
var servo = [];
var servo_i2c = [];
var oled = [];
var lcd = [];
var scroller = [];

// Specifies how you want your message payload to be passed
// from Octoblu to your device

var MESSAGE_SCHEMA = {
  "type": "object",
  "properties": {
    "name": {
      "title": "Name",
      "type": "string",
      "enum": names
    },
    "value": {
      "title": "Value",
      "type": "string"
    }
  }
};

// connect
var OPTIONS_SCHEMA = {
  "type": "object",
  "title": "Component",
  "required": [
    "components"
  ],
  "properties": {
    "components": {
      "type": "array",
      "maxItems": 2,
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "title": "Name",
            "type": "string",
            "description": "Name this component anything you like. (i.e Left_Motor). Sensor output will show up under this name in payload",
            "required": true
          },
          "action": {
            "title": "Action",
            "type": "string",
            "enum": ["digitalWrite", "digitalRead", "analogWrite", "analogRead", "servo", "PCA9685-Servo", "oled-i2c", "LCD-PCF8574A", "LCD-JHD1313M1"],
            "required": true
          },
          "pin": {
            "title": "Pin",
            "type": "string",
            "description": "Pin or i2c address used for this component",
            "required": true
          }

        },
        "required": [
          "name",
          "pin",
          "action"
        ]
      }
    }
  }
};

var OPTIONS_FORM = [

  {
    "key": "components",
    "add": "New",
    "style": {
      "add": "btn-success"
    },
    "items": [
      "components[].name",
      "components[].action",
      "components[].pin"
    ]
  }, {
    "type": "submit",
    "style": "btn-info",
    "title": "OK"
  }
];

var FORMSCHEMA = ["*"];

var conn = meshblu.createConnection({
  "uuid": meshbluJSON.uuid,
  "token": meshbluJSON.token,
  "server": meshbluJSON.server, // optional- defaults to ws://meshblu.octoblu.com
  "port": meshbluJSON.port // optional- defaults to 80
});

conn.on("notReady", function(data) {
  debug('UUID FAILED AUTHENTICATION!');
  debug('not ready', data);

  // Register a device
  conn.register({
    "type": "edison"
  }, function(data) {
    debug('registered device', data);
    meshbluJSON.uuid = data.uuid;
    meshbluJSON.token = data.token;
    fs.writeFile('meshblu.json', JSON.stringify(meshbluJSON), function(err) {
      if (err) return;
    });

    // Login to SkyNet to fire onready event
    conn.authenticate({
      "uuid": data.uuid,
      "token": data.token
    }, function(data) {
      debug('authenticating', data);
    });
  });
});

var testOptions = {
  "components": [{
    "name": "some_action",
    "action": "",
    "pin": ""
  }]
};


// Wait for connection to be ready to send/receive messages
conn.on('ready', function(data) {
  debug('ready event', data);
  conn.update({
    "uuid": meshbluJSON.uuid,
    "token": meshbluJSON.token,
    "optionsSchema": OPTIONS_SCHEMA,
    "optionsForm": OPTIONS_FORM
  });

  // Wait for the board to be ready for message passing
  // board-specific code


  var board = new five.Board({
      io: new intel()
    });




  board.on('ready', function() {


    conn.whoami({}, function(data) {
      if (_.has(data.options, "components")) {
        configBoard(data);
      } else if (!(_.has(data.options, "components"))) {
        conn.update({
          "uuid": meshbluJSON.uuid,
          "token": meshbluJSON.token,
          "options": testOptions
        });
        data.options = testOptions;
        configBoard(data);
      }

    });


    conn.on('config', function(data) {
      if (_.has(data.options, "components")) {
        if (!(_.isEqual(data.options.components, components))) {

          configBoard(data);

        } else {
          return;
        }

      }
    }); //end on config


    // Handles incoming Octoblu messages
    conn.on('message', function(data) {

      debug(data);
      handlePayload(data);

    }); // end Meshblu connection onMessage


    var configBoard = function(data) {


        component = [];
        servo = [];
        servo_i2c = [];
        names = [];
        read = {};
        oled = [];
        lcd = [];
        scroller = [];


        if (_.has(data.options, "components")) {
          components = data.options.components;
        } else {
          components = testOptions.components;
        }

        components.forEach(function(payload) {
          debug(payload);

          if(!(_.has(payload, "pin"))){
            return;
          }

          component[payload.name] = {
            "pin": payload.pin,
            "action": payload.action
          };

          switch (payload.action) {
            case "digitalRead":
              debug("digitalRead");
              board.pinMode(payload.pin, five.Pin.INPUT);
              board.digitalRead(payload.pin, function(value) {
                if(_.has(component, payload.name)){
                read[payload.name] = value;
                debug(value);
                }
              });

              break;
            case "digitalWrite":
              board.pinMode(payload.pin, board.MODES.OUTPUT);
              names.push(payload.name);
              break;
            case "analogRead":
              var analog_pin = "A" + payload.pin;
              board.pinMode(analog_pin, five.Pin.ANALOG);
              board.analogRead(analog_pin, function(value) {
                if(_.has(component, payload.name)){
                read[payload.name] = value;
                }
              });
              break;
            case "analogWrite":
              board.pinMode(payload.pin, five.Pin.PWM);
              names.push(payload.name);
              break;
            case "servo":
              servo[payload.name] = new five.Servo({
                pin: payload.pin,
              });
              names.push(payload.name);
              break;
            case "PCA9685-Servo":
              var spin = parseInt(payload.pin);
              servo_i2c[payload.name] = new five.Servo({
                address: 0x40,
                controller: "PCA9685",
                pin: spin
              });
              names.push(payload.name);
              break;
            case "oled-i2c":
                  debug("oledddoo");
                  var opts = {
                        width: 128,
                        height: 64,
                        address: parseInt(payload.pin)
                      };
                  oled[payload.name] = new Oled(board, five, opts);
                  oled[payload.name].clearDisplay();
                  oled[payload.name].setCursor(1, 1);
                  oled[payload.name].writeString(font, 3, 'Skynet Lives', 1, true);
                  oled[payload.name].update();
                  names.push(payload.name);
              break;
            case "LCD-PCF8574A":
                lcd[payload.name] = new five.LCD({
                              controller: "PCF8574A",
                              rows: 2,
                              cols: 16
                              });
                lcd[payload.name].cursor(0, 0).print("Skynet Lives");
                names.push(payload.name);

              break;
            case "LCD-JHD1313M1":
                lcd[payload.name] = new five.LCD({
                              controller: "JHD1313M1",
                              rows: 2,
                              cols: 16
                              });
                lcd[payload.name].cursor(0, 0).print("Skynet Lives");
                names.push(payload.name);
              break;



          } //end switch case


        }); // end for each

        MESSAGE_SCHEMA = {
          "type": "object",
          "properties": {
            "name": {
              "title": "Name",
              "type": "string",
              "enum": names
            },
            "value": {
              "title": "Value",
              "type": "string"
            }
          }
        }


        conn.update({
          "uuid": meshbluJSON.uuid,
          "token": meshbluJSON.token,
          "messageSchema": MESSAGE_SCHEMA,
          "messageFormSchema": FORMSCHEMA,
          "optionsSchema": OPTIONS_SCHEMA,
          "optionsForm": OPTIONS_FORM
        });
      } // end configBoard



    var handlePayload = function(data) {
      var payload = data.payload;
      var value = parseInt(payload.value);
      if (!component[payload.name])
        return;

      switch (component[payload.name].action) {
        case "digitalWrite":
          board.digitalWrite(component[payload.name].pin, value);
          break;
        case "analogWrite":
          board.analogWrite(component[payload.name].pin, value);
          break;
        case "servo":
          debug('servo', servo);
          servo[payload.name].stop();
          servo[payload.name].to(value);
          break;
        case "PCA9685-Servo":
          debug("servo happened")
          servo_i2c[payload.name].stop();
          servo_i2c[payload.name].to(value);
          break;
        case "oled-i2c":
          oled[payload.name].turnOnDisplay();
          oled[payload.name].clearDisplay();
          oled[payload.name].update();
          oled[payload.name].setCursor(1, 1);
          oled[payload.name].writeString(font, 3, payload.value , 1, true);
          break;
        case "LCD-PCF8574A":
            lcd[payload.name].clear();
            if(payload.value.length <= 16){
            lcd[payload.name].cursor(0,0).noAutoscroll().print(payload.value);
          }else if (payload.value.length > 16){
            lcd[payload.name].cursor(0,0).print(payload.value.substring(0,16));
            lcd[payload.name].cursor(1,0).print(payload.value.substring(16,33));
          }
          break;
        case "LCD-JHD1313M1":
            lcd[payload.name].clear();
            if(payload.value.length <= 16){
            lcd[payload.name].cursor(0,0).noAutoscroll().print(payload.value);
          }else if (payload.value.length > 16){
            lcd[payload.name].cursor(0,0).print(payload.value.substring(0,16));
            lcd[payload.name].cursor(1,0).print(payload.value.substring(16,33));
          }
          break;
      } //end switch case
    }


  }); // end johnny-five board onReady

  setInterval(function() {

    if (!(_.isEmpty(read))) {
      debug(read);

      conn.message({
        "devices": "*",
        "payload": read
      });

    }


  }, 500);

}); // end Meshblu connection onReady
