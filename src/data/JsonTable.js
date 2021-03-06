import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import Model from "/apogeejs-model-lib/src/data/Model.js";
import CodeableMember from "/apogeejs-model-lib/src/datacomponents/CodeableMember.js";

/** This class encapsulatees a data table for a JSON object. 
 * (This object does also support function objects as elements of the json, though
 * objects using this, such as the JsonTableComponent, may not.)
*/
export default class JsonTable extends CodeableMember {

    constructor(name,instanceToCopy,keepUpdatedFixed,specialCaseIdValue) {
        super(name,instanceToCopy,keepUpdatedFixed,specialCaseIdValue);
    }

    //------------------------------
    // Codeable Methods
    //------------------------------

    /** This method returns the argument list. We override it because
     * for JsonTable it gets cleared when data is set. However, whenever code
     * is used we want the argument list to be this value. */
    getArgList() {
        return [];
    }
        
    /** This is he process member function from codeable. */
    processMemberFunction(model,memberGenerator) {
        let initialized = this.initializeMemberFunction(model);
        if(initialized) {
            //the data is the output of the function
            let memberFunction = memberGenerator();
            let data = memberFunction();
            this.applyData(model,data);

            //we must separately apply the asynch data set promise if there is one
            if((data)&&(data instanceof Promise)) {
                this.applyAsynchFutureValue(model,data);
            }
        } 
    }

    /** This is an optional method that, when present will allow the member data to be set if the 
     * member function is cleared. */
    getDefaultDataValue() {
        return "";
    }

    //------------------------------
    // Member Methods
    //------------------------------

    /** This method extends set data from member. It also
     * freezes the object so it is immutable. (in the future we may
     * consider copying instead, or allowing a choice)*/
    setData(model,data) {
        
        //make this object immutable
        apogeeutil.deepFreeze(data);

        //store the new object
        return super.setData(model,data);
    }

    /** This method creates a member from a json. It should be implemented as a static
     * method in a non-abstract class. */ 
    static fromJson(model,json) {
        let member = new JsonTable(json.name,null,null,json.specialIdValue);

        //get a copy of the initial data and set defaults if needed
        let initialData = {};
        Object.assign(initialData,json.updateData);

        //if no value is set, set to an empty string
        if(
            (!initialData.functionBody) && //no function body (anything falsy is an invalid function)
            (initialData.data === undefined) && //no data value set
            (!initialData.error) && //no error (any error will set the error state)
            (!initialData.errorList) && //DEPRECATED! no error list (any error list will set the error state)
            (initialData.invalidValue !== true) //not invalid value
        ) initialData.data = member.getDefaultDataValue();

        member.setUpdateData(model,initialData);

        return member;
    }
}

//============================
// Static methods
//============================

JsonTable.generator = {};
JsonTable.generator.type = "apogee.JsonMember";
JsonTable.generator.createMember = JsonTable.fromJson;
JsonTable.generator.setDataOk = true;
JsonTable.generator.setCodeOk = true;

//register this member
Model.addMemberGenerator(JsonTable.generator);