// app.js (module)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging.js";

const firebaseConfig = {
    apiKey: "AIzaSyCQcgEN51zZ3wnQGt3cd2cTBKpfsR55VEU",
    authDomain: "irrigation-iot-esp.firebaseapp.com",
    databaseURL: "https://irrigation-iot-esp-default-rtdb.firebaseio.com",
    projectId: "irrigation-iot-esp",
    storageBucket: "irrigation-iot-esp.firebasestorage.app",
    messagingSenderId: "877141032044",
    appId: "1:877141032044:web:e5f4c417466ce936f76c49"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();
const messaging = getMessaging(app);

const motorId = "device_001";


// MQTT CONNECTION

const mqttClient = mqtt.connect(
"wss://d71c49fb95344b20bf831879c83b3c75.s1.eu.hivemq.cloud:8884/mqtt",
{
    username: "Vsena",
    password: "Smart@123"
});

mqttClient.on("connect", () => {

    console.log("MQTT connected");

    mqttClient.subscribe(`farm/${motorId}/status/#`);
    mqttClient.subscribe(`farm/${motorId}/sensor/#`);
    mqttClient.subscribe(`farm/${motorId}/telemetry`);

});


// MQTT MESSAGE HANDLER

mqttClient.on("message", (topic, message) => {
    
    const payload = message.toString();    

    console.log("MQTT Message:", topic, payload);
    
    if(topic === `farm/${motorId}/telemetry`){

    let data = JSON.parse(message.toString());
    
    updateSensorUI("voltage_r",data.voltage_r);
    updateSensorUI("voltage_y",data.voltage_y);
    updateSensorUI("voltage_b",data.voltage_b);
    
    updateSensorUI("current_r",data.current_r);
    updateSensorUI("current_y",data.current_y);
    updateSensorUI("current_b",data.current_b);
    
    updateSensorUI("pressure",data.pressure);
    
    updateMotorUI(data.motor);
    return;    
    }
    const parts = topic.split("/");
    const type = parts[2];
    const name = parts[3];

    if(type === "status"){
        updateStatusUI(name, payload);
    }


});


// SENSOR UI UPDATE

function updateSensorUI(name,value){

    if(name==="voltage_r")
        document.getElementById("rPhase").innerText=value+" V";

    if(name==="voltage_y")
        document.getElementById("yPhase").innerText=value+" V";

    if(name==="voltage_b")
        document.getElementById("bPhase").innerText=value+" V";

    if(name==="current_r")
        document.getElementById("rCurrent").innerText=value+" A";

    if(name==="current_y")
        document.getElementById("yCurrent").innerText=value+" A";

    if(name==="current_b")
        document.getElementById("bCurrent").innerText=value+" A";

    if(name==="pressure")
        document.getElementById("pressure").innerText=value;

}


// STATUS UI UPDATE

function updateStatusUI(name,value){

    if(name==="motor"){

        const motorCard=document.getElementById("motorCard");
        const motorBtn=document.getElementById("motorBtn");

        if(value=="1"){

            motorCard.classList.add("on");
            motorCard.classList.remove("off");
            motorBtn.innerText="ON";

        }else{

            motorCard.classList.add("off");
            motorCard.classList.remove("on");
            motorBtn.innerText="OFF";

        }
    }

    if(name.startsWith("v")){

        valvesButtons.forEach((v)=>{

            if(v.valveId===name){

                if(value=="1"){
                    v.card.classList.add("on");
                    v.card.classList.remove("off");
                    v.button.innerText="ON";
                }else{
                    v.card.classList.add("off");
                    v.card.classList.remove("on");
                    v.button.innerText="OFF";
                }

            }

        });

    }

}


// LOGIN

window.login=function(){

    const email=document.getElementById("email").value;
    const password=document.getElementById("password").value;

    signInWithEmailAndPassword(auth,email,password)
    .catch(err=>{
        document.getElementById("loginError").innerText=err.message;
    });

};


// LOGOUT

window.logout=function(){
    signOut(auth);
};


// NOTIFICATIONS

async function enableNotifications(){

    const permission=await Notification.requestPermission();

    if(permission==="granted"){

        const token=await getToken(messaging,{
            vapidKey:"YOUR_VAPID_KEY"
        });

        await set(
            ref(db,`devices/${motorId}/notification_token`),
            token
        );

    }

}


// AUTH LISTENER

onAuthStateChanged(auth,user=>{

    if(user){

        document.getElementById("loginDiv").style.display="none";
        document.getElementById("dashboard").style.display="block";

        enableNotifications();
        startDashboard();

    }else{

        document.getElementById("loginDiv").style.display="block";
        document.getElementById("dashboard").style.display="none";

    }

});


// DASHBOARD

const valvesContainer=document.getElementById("valveContainer");
const valvesButtons=[];

function startDashboard(){

    valvesContainer.innerHTML="";
    valvesButtons.length=0;


    const motorBtn=document.getElementById("motorBtn");

    motorBtn.onclick=()=>{
        console.log("Motor button pressed");
        const current=motorBtn.innerText==="ON"?"1":"0";
        const newState=current==="1"?"0":"1";

        mqttClient.publish(
            `farm/${motorId}/cmd/motor`,
            newState,
            {},
        (err) => {
                if(err)
                    console.log("Publish failed", err);
                else
                    console.log("Command sent:", newState);
            }
        );

    };


    for(let i=1;i<=8;i++){

        const card=document.createElement("div");
        card.className="card off";

        const title=document.createElement("h4");
        title.innerText="Valve "+i;

        const img=document.createElement("img");
        img.src="assets/valve.png";

        const button=document.createElement("button");
        button.innerText="OFF";

        card.appendChild(title);
        card.appendChild(img);
        card.appendChild(button);

        valvesContainer.appendChild(card);

        valvesButtons.push({card,button,valveId:`v${i}`});

        button.onclick=()=>{

            const state=button.innerText==="ON"?"1":"0";
            const newState=state==="1"?"0":"1";

            mqttClient.publish(
                `farm/${motorId}/cmd/v${i}`,
                newState
            );

        };

    }

}





