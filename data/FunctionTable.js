import base from "/apogeeutil/base.js";
import apogeeutil from "/apogeeutil/apogeeUtilLib.js";
import Model from "/apogee/data/Model.js";
import ContextHolder from "/apogee/datacomponents/ContextHolder.js";
import CodeableMember from "/apogee/datacomponents/CodeableMember.js";

/** This is a function. */
export default class FunctionTable extends CodeableMember {

    constructor(model,name,owner,initialData) {
        super(model,name);

        //mixin init where needed
        this.contextHolderMixinInit();    
        
        this.initOwner(owner);
        
        //set initial data
        var argList = initialData.argList ? initialData.argList : [];
        var functionBody = initialData.functionBody ? initialData.functionBody : "";
        var supplementalCode = initialData.supplementalCode ? initialData.supplementalCode : "";
        this.applyCode(argList,functionBody,supplementalCode);
    }

    //------------------------------
    // Codeable Methods
    //------------------------------

    processMemberFunction(memberGenerator) {
        var memberFunction = this.getLazyInitializedMemberFunction(memberGenerator);
        this.setData(memberFunction);
    }

    getLazyInitializedMemberFunction(memberGenerator) {

        //create init member function for lazy initialization
        //we need to do this for recursive functions, or else we will get a circular reference
        var initMember = () => {
            var impactorSuccess = this.memberFunctionInitialize();
            if(impactorSuccess) {
                return memberGenerator();
            }
            else {
                //error handling
                var issue;
                
                //in the case of "result invalid" or "result pending" this is 
                //NOT an error. But I don't know
                //how else to stop the calculation other than throwing an error, so 
                //we do that here. It should be handled by anyone calling a function.
                if(this.hasError()) {
                    issue = new Error("Error in dependency: " + this.getFullName());

                }
                else if(this.getResultPending()) {
                    issue = base.MEMBER_FUNCTION_PENDING_THROWABLE;
                }
                else if(this.getResultInvalid()) {
                    issue = base.MEMBER_FUNCTION_INVALID_THROWABLE;
                }
                else {
                    issue = new Error("Unknown problem in initializing: " + this.getFullName());
                }
                
                throw issue;
            } 
        }

        //this is called from separate code to make debugging more readable
        return __functionTableWrapper(initMember);
    }

    //------------------------------
    // Member Methods
    //------------------------------

    /** This method creates a member from a json. It should be implemented as a static
     * method in a non-abstract class. */ 
    static fromJson(model,owner,json) {
        return new FunctionTable(model,json.name,owner,json.updateData);
    }

    /** This method extends the base method to get the property values
     * for the property editting. */
    static readProperties(member,values) {
        var argList = member.getArgList();
        var argListString = argList.toString();
        values.argListString = argListString;
        return values;
    }

    /** This method executes a property update. */
    static getPropertyUpdateAction(member,newValues) {
        if((newValues.updateData)&&(newValues.updateData.argList !== undefined)) {
            var actionData = {};
            actionData.action = "updateCode";
            actionData.memberName = member.getFullName();
            actionData.argList = newValues.updateData.argList;
            actionData.functionBody = member.getFunctionBody();
            actionData.supplementalCode = member.getSupplementalCode();
            return actionData;
        }
        else {
            return null;
        }
    }

}


//add components to this class
base.mixin(FunctionTable,ContextHolder);

//============================
// Static methods
//============================

FunctionTable.generator = {};
FunctionTable.generator.displayName = "Function";
FunctionTable.generator.type = "apogee.FunctionTable";
FunctionTable.generator.createMember = FunctionTable.fromJson;
FunctionTable.generator.readProperties = FunctionTable.readProperties;
FunctionTable.generator.getPropertyUpdateAction = FunctionTable.getPropertyUpdateAction;
FunctionTable.generator.setDataOk = false;
FunctionTable.generator.setCodeOk = true;

//register this member
Model.addMemberGenerator(FunctionTable.generator);


