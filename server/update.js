const fs = require('fs');
const request = require("request");

const { JSONReq, URLReq, MethodValues } = require("./urlreqs")

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
            const response = JSON.parse(req[2]);
            const cversion = getVersionInfo();
            console.log(response)
            console.log(cversion)
            if(response.branches[cversion.branch].current != cversion.version){
                resolve([true, response.branches[cversion.branch].current]);
            }else{
                resolve([false, null]);
            }
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
    const cversion = getVersionInfo();
    return new Promise(async (resolve, err)=>{
        let updateTest = await checkForNewVersion();
        console.log(updateTest)
        if(updateTest[0] == true){
            console.log(`Updating to ${updateTest[1]}`);
            resolve(true);
            
            const req = await URLReq(MethodValues.GET, "https://admin.va-center.com/updateFile", null, null, null);
            JSON.parse(req[2]).branches[cversion.branch].releases[updateTest[1]].FilesChanged.forEach(async file =>{
                const fileRaw = (await URLReq(MethodValues.GET, `https://raw.githubusercontent.com/VACenter/VACenter/${cversion.branch}/${file}`, null, null, null))[2];
                fs.writeFileSync(`${__dirname}/../${file}`, fileRaw);
                console.log(file)
            });
            const packageObj = require('./../package.json')
            packageObj.version = cversion.version;
            fs.writeFileSync(`${__dirname}/../package.json`, JSON.stringify(packageObj, null, 2));
            const packagelock = require('./../package-lock.json')
            packagelock.version = cversion.version;
            fs.writeFileSync(`${__dirname}/../package-lock.json`, JSON.stringify(packagelock, null, 2));
            const versionFile = getVersionInfo();
            versionFile.version = updateTest[1];
            fs.writeFileSync(`${__dirname}/../version.json`, JSON.stringify(versionFile, null, 2));
            console.log("RESTARTING")
            process.exit(11);
        }else{
            resolve(false);
        }
        
    })
}


module.exports = {update, checkForNewVersion, getVersionInfo}