//@ts-check

const fs = require('fs');
const request = require("request");
const sqlite3 = require('sqlite3').verbose();

const { JSONReq, URLReq, MethodValues } = require("./urlreqs")
const {
    db, GetPPURL,
    GetAircraft, GetAircrafts, CreateAircraft, DeleteAircraft,
    GetEvent, GetEvents, CreateEvent, DeleteEvent,
    GetNotifications, CreateNotification, DeleteNotification, DeleteUsersNotifications,
    GetOperator, GetOperators, CreateOperator, DeleteOperator,
    GetPirep, GetUsersPireps, GetPireps, CreatePirep, UpdatePirep,
    GetRanks, UpdateRank, CreateRank, DeleteRank,
    GetRoute, GetRoutes, GetRouteByNum, CreateRoute, UpdateRoute, DeleteRoute,
    GetStats, UpdateStat, DeleteStat,
    GetToken, CreateToken, DeleteTokens,
    GetUser, GetUsers, CreateUser, UpdateUser, DeleteUser,
    GetSlots, UpdateSlot, CreateSlot, DeleteSlot, GetSlotsWithRoutes, run
} = require("./db");

function dynamicSort(property) {
    var sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a, b) {
        /* next line works with strings and numbers, 
         * and you may want to customize it to your needs
         */
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}


function newError(error, title) {
    const requestSPECIAL = require('request');
    // @ts-ignore
    let config = JSON.parse(fs.readFileSync(path.join(__dirname, "/../config.json")))
    let errorB;
    if (error instanceof Error) {
        errorB = error.toString()
    } else if (typeof error == "object") {
        errorB = JSON.stringify(error)
    } else {
        errorB = error;
    }
    const options2 = {
        method: 'POST',
        url: 'https://error.va-center.com/api/reportBug',
        form: { title: title ? title : "AUTO - ERROR - " + config.name, body: errorB, contact: JSON.stringify(config) }
    };

    request(options2, function (error2, response2, body2) {
        console.log("NEW REPORT")
        console.log(options2.form)
    })
}

/**
 * Compares to versions
 * @param {string} a 
 * @param {string} b 
 * @returns {number} 1 means version is greater 0 means version is same -1 means version is smaller
 */
function compareVersion(a, b) {
    let x = a.split('.').map(e => parseInt(e));
    let y = b.split('.').map(e => parseInt(e));
    let z = "";
    let i;
    for (i = 0; i < x.length; i++) {
        if (x[i] === y[i]) {
            z += "e";
        } else
            if (x[i] > y[i]) {
                z += "m";
            } else {
                z += "l";
            }
    }
    if (!z.match(/[l|m]/g)) {
        return 0;
    } else if (z.split('e').join('')[0] == "m") {
        return 1;
    } else {
        return -1;
    }
}
function compareVersionsOrder(a, b) {
    let x = a.num.split('.').map(e => parseInt(e));
    let y = b.num.split('.').map(e => parseInt(e));
    let z = "";
    let i;

    for (i = 0; i < x.length; i++) {
        if (x[i] === y[i]) {
            z += "e";
        } else
            if (x[i] > y[i]) {
                z += "m";
            } else {
                z += "l";
            }
    }
    if (!z.match(/[l|m]/g)) {
        return 0;
    } else if (z.split('e').join('')[0] == "m") {
        return 1;
    } else {
        return -1;
    }
}
function count(obj) { return Object.keys(obj).length; }


/**@module Updates */

/**
 * Get contents of the Version.json file
 * @returns {Object} The contents on the version.json file
 */
function getVersionInfo(){
    return require("./../version.json");
}


/**
 * Checks for new version
 * @returns {Promise<Array>} returns [false,null] or [true, versionNum]
 */
function checkForNewVersion(){
    return new Promise(async (resolve, err)=>{
        const req = await URLReq(MethodValues.GET, "https://admin.va-center.com/updateFile", null, null, null);
        if (req[1].statusCode == 200) {
            //Get current Version info
            let branch = getVersionInfo().branch;
            let cvn = getVersionInfo().version;
            const currentVersionFull = branch == "beta" ? `${cvn}B` : (branch == "demo" ? `${cvn}B` : `${cvn}`)
            const currentVersionNum = currentVersionFull.slice(0, -1);
            const currentVersionBranchInd = currentVersionFull.charAt(currentVersionFull.length - 1);
            const currentVersionBranch = currentVersionBranchInd == "B" ? "beta" : (currentVersionBranchInd == "M" ? "master" : null);

            //Get Versions
            const body = JSON.parse(req[2]);
            const branchData = body.branches[currentVersionBranch];
            const releases = branchData.releases;
            
            //Running through releases to find the required
            let versions = [];
            Object.entries(releases).forEach(([key, value]) => {
                console.log(key)
                if (compareVersion(currentVersionNum, key) == -1) {
                    versions.push(key);
                }

            })
            resolve((versions.length != 0) ? ([true, versions]) : ([false, null]));
        }else {
            err(req[0]);
        }
    })
}

/**
 * Runs the entire update loop
 * @returns {Promise<boolean>} Boolean on whether an update was detected.
 */

function update(){
    console.log(1)
    return new Promise(async (resolve, err)=>{
        console.log(2)
        //Version Numbers
        let branch = getVersionInfo().branch;
        let cvn = getVersionInfo().version;
        let cvnb = branch == "beta" ? `${cvn}B` : (branch == "demo" ? `${cvn}B` : `${cvn}`)
        console.log(3)
        //Check if update required
        let updateTest = await checkForNewVersion();
        console.log(4)
        //Yes:
        if(updateTest[0] == true){
            console.log(5)
            console.log(`Updating to ${updateTest[1]}`);
            const req = await URLReq(MethodValues.GET, "https://admin.va-center.com/updateFile", null, null, null);
            console.log(6)
            //Versions
            const body = JSON.parse(req[2]);
            const branchData = body.branches[branch];
            const releases = branchData.releases;
            console.log(7)
            let order = [];
            let orderComplete = 0;
            console.log(8)

            Object.entries(releases).forEach(([key, value]) => {
                console.log(9)
                console.log(key)
                if(updateTest[1].includes(key)){
                    console.log(10)
                    let versionObj = {
                        dbQueries: [],
                        dirAdds: [],
                        fileRems: [],
                        fileWrites: [],
                        num: key
                    };
                    Object.entries(value.dbQueries).forEach(([key, value]) => {
                        console.log(11)
                        versionObj.dbQueries.push(value);
                    })
                    Object.entries(value.dirAdds).forEach(([key, value]) => {
                        console.log(12)
                        versionObj.dirAdds.push(value);
                    })
                    Object.entries(value.filesRemoved).forEach(([key, value]) => {
                        console.log(13)
                        versionObj.fileRems.push(value);
                    })
                    Object.entries(value.filesChanged).forEach(([key, value]) => {
                        console.log(14)
                        versionObj.fileWrites.push(value);
                    })
                    order.push(versionObj);
                }
            })
            order.sort(compareVersionsOrder);

            order.forEach((value) => {
                console.log(15)
                console.log(value.num)
                let queriesRan = 0;
                let dirsRan = 0;
                let remsRan = 0;
                let writesRan = 0;

                //Run Queries
                value.dbQueries.sort(dynamicSort("num"));
                value.dbQueries.forEach((async query =>{
                    console.log(16)
                    await run(query.value);
                    queriesRan++;
                }))

                //Add directories
                value.dirAdds.forEach((dir =>{
                    console.log(17)
                    if (fs.existsSync(`${__dirname}/../${dir}`) == false){
                        fs.mkdirSync(`${__dirname}/../${dir}`);
                    }
                    dirsRan ++;
                }))

                //Remove Files
                value.fileRems.forEach((file => {
                    console.log(18)
                    if (fs.existsSync(`${__dirname}/../${file}`) == true) {
                        fs.unlinkSync(`${__dirname}/../${file}`);
                    }
                    
                    remsRan ++;
                }))
                //Write Files
                value.fileWrites.forEach((file => {
                    console.log(19)
                    URLReq(MethodValues.GET, `https://raw.githubusercontent.com/VACenter/VACenter/${branch}/${file}`, null, null, null).then(res => {
                        console.log(20)
                        const fileRaw = res[2];
                        fs.writeFileSync(`${__dirname}/../${file}`, fileRaw);
                        writesRan++;
                    });
                }))
                
                let checker = setInterval(()=>{
                    if ((writesRan == value.fileWrites.length) && (remsRan == value.fileRems.length) && (dirsRan == value.dirAdds.length) && (queriesRan == value.dbQueries.length)){
                        orderComplete ++;
                        clearInterval(checker);
                    }
                }, 1000)
            })

            let updateFinChecker = setInterval(() => {
                if(orderComplete == order.length){
                    resolve(true);
                    console.log(21);
                    //Update Version info
                        //Package.json
                        const packageObj = require('./../package.json')
                        packageObj.version = order[order.length - 1].num;
                        fs.writeFileSync(`${__dirname}/../package.json`, JSON.stringify(packageObj, null, 2));
                        console.log(22);
                        //Package-lock.json
                        const packagelock = require('./../package-lock.json')
                        packagelock.version = order[order.length - 1].num;
                        fs.writeFileSync(`${__dirname}/../package-lock.json`, JSON.stringify(packagelock, null, 2));
                        console.log(23);
                        //VersionFile
                        const versionFile = getVersionInfo();
                        versionFile.version = order[order.length - 1].num;
                        fs.writeFileSync(`${__dirname}/../version.json`, JSON.stringify(versionFile, null, 2));
                        console.log(24);

                    //Tell Instance Manager
                    const addition = branch == "beta" ? "B" : ""
                    const options = {
                        method: 'POST',
                        url: 'https://admin.va-center.com/stats/instances/update',
                        form: { id: require("./../config.json").other.ident, version: `${order[order.length - 1].num}${addition}` }
                    };
                    console.log(25);
                    request(options, function (error, response, body) {
                        if (error) {
                            newError(error, `${require("./../config.json").code} - updateError`)
                            clearInterval(updateFinChecker)
                        }
                        console.log(26);
                        if (response.statusCode == 200) {
                            clearInterval(updateFinChecker)
                            console.log(27);
                            const {exec} = require("child_process")
                            exec("npm i", function (error, stdout, stderr){
                                if(error){
                                    console.error(`Error: ${error}`)
                                }else if(stderr){
                                    console.warn(`Warning: ${stderr}`)
                                    console.log("RESTARTING")
                                    process.exit(11);
                                }else{
                                    console.log("RESTARTING")
                                    process.exit(11);
                                }
                            })
                        } else {
                            clearInterval(updateFinChecker)
                            newError([response.statusCode, response.body], `${require("./../config.json").code} - updateError`)
                            console.error([response.statusCode, response.body])
                        }
                    })
                }
            }, 2500);
        }else{
            resolve(false);
        }
        
    })
}


module.exports = {update, checkForNewVersion, getVersionInfo}