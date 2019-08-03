import base from "/apogeeutil/base.js";
import EventManager from "/apogeeutil/EventManager.js";
import {doAction} from "/apogee/actions/action.js";
import ContextManager from "/apogee/lib/ContextManager.js";
import ContextHolder from "/apogee/datacomponents/ContextHolder.js";
import Owner from "/apogee/datacomponents/Owner.js";
import RootHolder from "/apogee/datacomponents/RootHolder.js";

/** This is the workspace. Typically owner should be null. It
 * is used for creating virtual workspaces. 
 * - optionalJson - For new workspaces this can be empty. If we are deserializing an existing
 * workspace, the json for it goes here.
 * - optionalContextOwner - This is used if the workspace should be placed in a context. This is 
 * used for the virtual workspace created for folder functions, so the folder function can 
 * access variables from the larger workspace.
 * */
export default function Workspace(optionalContextOwner) {
    //base init
    EventManager.init.call(this);
    ContextHolder.init.call(this);
    Owner.init.call(this);
    RootHolder.init.call(this);
    
    // This is a queue to hold actions while one is in process.
    this.actionInProgress = false;
    this.messengerActionList = []
    this.consecutiveActionCount = 0;
    this.activeConsecutiveActionLimit = Workspace.CONSECUTIVE_ACTION_INITIAL_LIMIT;
    this.name = Workspace.DEFAULT_WORKSPACE_NAME;
    
    this.owner = optionalContextOwner ? optionalContextOwner : null;
}

//add components to this class
base.mixin(Workspace,EventManager);
base.mixin(Workspace,ContextHolder);
base.mixin(Workspace,Owner);
base.mixin(Workspace,RootHolder);


Workspace.DEFAULT_WORKSPACE_NAME = "Workspace";
Workspace.ROOT_FOLDER_NAME = "Model";

Workspace.CONSECUTIVE_ACTION_INITIAL_LIMIT = 500;

Workspace.EMPTY_WORKSPACE_JSON = {
    "fileType": "apogee workspace",
    "version": 0.2,
    "name": "Custom Component Demo",
    "data": {
        "name": "Model",
        "type": "apogee.Folder"
    }
}

/** This method returns the root object - implemented from RootHolder.  */
Workspace.prototype.setName = function(name) {
    this.name = name;
}

/** This method returns the root object - implemented from RootHolder.  */
Workspace.prototype.getName = function() {
    return this.name;
}

/** This method returns the root object - implemented from RootHolder.  */
Workspace.prototype.getRoot = function() {
    return this.rootFolder;
}

/** This method sets the root object - implemented from RootHolder.  */
Workspace.prototype.setRoot = function(member) {
    this.rootFolder = member;
}

/** This allows for a workspace to have a parent. For a normal workspace this should be null. 
 * This is used for finding variables in scope. */
Workspace.prototype.getOwner = function() {
    return this.owner;
}

/** This method updates the dependencies of any children in the workspace. */
Workspace.prototype.updateDependeciesForModelChange = function(recalculateList) {
    if(this.rootFolder) {
        this.rootFolder.updateDependeciesForModelChange(recalculateList);
    }
}

/** This method removes any data from this workspace on closing. */
Workspace.prototype.onClose = function() {
    this.rootFolder.onClose();
}

//------------------------------
// Queded Action Methods
//------------------------------

/** This function triggers the action for the queued action to be run when the current thread exits. */
Workspace.prototype.isActionInProgress = function() {
    return this.actionInProgress;
}

Workspace.prototype.setActionInProgress = function(inProgress) {
    this.actionInProgress = inProgress;
}

Workspace.prototype.saveMessengerAction = function(actionInfo) {
    this.messengerActionList.push(actionInfo);
}

Workspace.prototype.getSavedMessengerAction = function() {
    if(this.messengerActionList.length > 0) {
        var actionData = {};
        actionData.action = "compoundAction";
        actionData.actions = this.messengerActionList;
        this.messengerActionList = []
        return actionData;
    }
    else {
        return null;
    }
}

/** This method should be called for each consecutive queued action. It checks it if there are 
 * too many. If so, it returns true. In so doing, it also backs of the consecutive queued 
 * action count so next time it will take longer. Any call to clearConsecutiveQueuedActionCount
 * will return it to the default initial value.
 */
Workspace.prototype.checkConsecutiveQueuedActionLimitExceeded = function() {
    this.consecutiveActionCount++;
    
    //check the limit
    var exceedsLimit = (this.consecutiveActionCount > this.activeConsecutiveActionLimit);
    if(exceedsLimit) {
        //back off limit for next time
        this.activeConsecutiveActionLimit *= 2;
    }
    
    return exceedsLimit;
}

/** This should be called wo abort any queued actions. */
Workspace.prototype.setCalculationCanceled = function() {
    //reset queued action variables
    this.clearCommandQueue();
    
    alert("The tables are left in improper state because the calculation was aborted. :( ");
}

/** This should be called when there is not a queued action. */
Workspace.prototype.clearConsecutiveQueuedTracking = function() {
    this.consecutiveActionCount = 0;
    this.activeConsecutiveActionLimit = Workspace.CONSECUTIVE_ACTION_INITIAL_LIMIT;
}

/** This method resets the command queue */
Workspace.prototype.clearCommandQueue = function() {
    //reset queued action variables
    this.messengerActionList = [];
    this.clearConsecutiveQueuedTracking();
}


//------------------------------
// Owner Methods
//------------------------------

/** this method is implemented for the Owner component/mixin. */
Workspace.prototype.getWorkspace = function() {
   return this;
}

/** this method gets the hame the children inherit for the full name. */
Workspace.prototype.getPossesionNameBase = function() {
    //the name starts over at a new workspace
    return "";
}

/** This method looks up a member by its full name. */
Workspace.prototype.getMemberByPathArray = function(path,startElement) {
    if(startElement === undefined) startElement = 0;
    if(path[startElement] === this.rootFolder.getName()) {
        if(startElement === path.length-1) {
            return this.rootFolder;
        }
        else {
            startElement++;
            return this.rootFolder.lookupChildFromPathArray(path,startElement);
        }
    }
    else {
        return null;
    }
}

//------------------------------
//ContextHolder methods
//------------------------------

/** This method retrieve creates the loaded context manager. */
Workspace.prototype.createContextManager = function() {
    //set the context manager
    var contextManager = new ContextManager(this);
    
    //if no owner is defined for the workspace - the standard scenario, we will
    //add all global variables as a data entry for the context, so these variables
    //can be called from the workspace. 
    if(!this.owner) {
        var globalVarEntry = {};
        globalVarEntry.data = __globals__;
        contextManager.addToContextList(globalVarEntry);
    }
    //if there is an owner defined, the context manager for the owner will be used
    //to lokoup variables. This is done for a folder function, so that it has
    //access to other variables in the workspace.
    
    return contextManager;
}

//============================
// Save Functions
//============================

/** This is the supported file type. */
Workspace.SAVE_FILE_TYPE = "apogee workspace";

/** This is the supported file version. */
Workspace.SAVE_FILE_VERSION = 0.2;

/** This method creates a headless workspace json from a folder json. It
 * is used in the folder function. */
Workspace.createWorkpaceJsonFromFolderJson = function(name,folderJson) {
	//create a workspace json from the root folder json
	var workspaceJson = {};
    workspaceJson.fileType = Workspace.SAVE_FILE_TYPE;
    workspaceJson.version = Workspace.SAVE_FILE_VERSION;
    workspaceJson.name = name;
    workspaceJson.data = folderJson;
	return workspaceJson;
}

/** This saves the workspace */
Workspace.prototype.toJson = function() {
    var rootFolderJson = this.rootFolder.toJson();
    return Workspace.createWorkpaceJsonFromFolderJson(this.name,rootFolderJson);
}

/** This is loads data from the given json into this workspace. */
Workspace.prototype.loadFromJson = function(json) {
    var fileType = json.fileType;
	if(fileType !== Workspace.SAVE_FILE_TYPE) {
		throw base.createError("Bad file format.",false);
	}
    if(json.version !== Workspace.SAVE_FILE_VERSION) {
        throw base.createError("Incorrect file version. CHECK APOGEEJS.COM FOR VERSION CONVERTER.",false);
    }

    if(json.name !== undefined) {
        this.name = json.name;
    }

    var actionData = {};
    actionData.action = "createMember";
    actionData.workspaceIsOwner = true;
    actionData.createData = json.data;
    var actionResult = doAction(this,actionData);
    
    return actionResult;
}

//================================
// Member generator functions
//================================

Workspace.memberGenerators = {};

/** This methods retrieves the member generator for the given type. */
Workspace.getMemberGenerator = function(type) {
    return Workspace.memberGenerators[type];
}

/** This method registers the member generator for a given named type. */
Workspace.addMemberGenerator = function(generator) {
    Workspace.memberGenerators[generator.type] = generator;
}

