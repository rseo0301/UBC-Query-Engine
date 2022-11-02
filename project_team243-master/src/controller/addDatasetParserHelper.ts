const http = require("http");

export default class AddDatasetParserHelper {
    public static filterRoomData(element: any, shortName: string): any {
        if (element.nodeName === "div" &&
            element.attrs[0].value.startsWith("view view-buildings-and-classrooms view-id-buildings_and_classrooms")) {
            let fullName: any;
            let address: any;
            for (let child of element.childNodes) {
                if (child.attrs !== undefined && child.attrs[0].value === "view-content") {
                    let buildingInfo = child.childNodes[1].childNodes[1].childNodes[1];
                    fullName = buildingInfo.childNodes[1].childNodes[0].childNodes[0].value;
                    address = buildingInfo.childNodes[3].childNodes[0].childNodes[0].value;
                    return {fullName: fullName, address: address, element: element};
                }
            }
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let foundData = this.filterRoomData(child, shortName);
                if (foundData !== -1) {
                    return foundData;
                }
            }
        }
        return -1;
    }

    public static finishFilterRoomData(element: any, shortName: string, fullName: string,
                                       address: string, geo: {}) {
        if (element.nodeName === "table") {
            let href: any, roomNumber: any, capacity: any, furniture: any, roomType: any;
            let counter = 0, arr: any[] = [];
            for (let y of element.childNodes) {
                if (y.nodeName === "tbody") {
                    for (let z of y.childNodes) {
                        if (z.nodeName === "tr") {
                            try {
                                href = z.childNodes[1].childNodes[1].attrs[0].value;
                                roomNumber = z.childNodes[1].childNodes[1].childNodes[0].value;
                                capacity = z.childNodes[3].childNodes[0].value;
                                furniture = z.childNodes[5].childNodes[0].value;
                                roomType = z.childNodes[7].childNodes[0].value;
                                if (href !== undefined || roomNumber !== undefined || capacity !== undefined ||
                                    furniture !== undefined || roomType !== undefined) {
                                    let obj = {
                                        fullName: fullName, href: href, shortName: shortName.trim(),
                                        name: shortName.trim() + "_" + roomNumber, address: address,
                                        roomNumber: roomNumber, capacity: capacity.trim(),
                                        furniture: furniture.trim(), roomType: roomType.trim()
                                    };
                                    arr.push({...obj, ...geo});
                                    // arr.push(obj);
                                    counter++;
                                }
                            } catch (e) {
                                continue;
                            }
                        }
                    }
                    return arr;
                }
            }
            return -1;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let foundData: any = this.finishFilterRoomData(child, shortName, fullName, address, geo);
                if (foundData !== -1) {
                    return foundData;
                }
            }
        }
        return -1;
    }

    public static IsJsonString(str: string) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    public static getGeolocation(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let data = "";
            http.get(url, (resp: any) => {
                resp.on("data", (chunk: any) => {
                    data += chunk;
                });
                resp.on("end", () => {
                    let finish = JSON.parse(data);
                    resolve(finish);
                });
            }).on("error", (err: any) => {
                resolve({});
            });
        });
    }

    public static filterKeys(data: string): any[] {
        let newArray: any[] = [];
        const array = JSON.parse(data).result; // data is an array of objects
        array.forEach(function (value: any) {
            if (value.Section === "overall") {
                value.Year = "1900";
            }
            delete value.tier_eighty_five;
            delete value.Section;
            delete value.Detail;
            delete value.tier_seventy_two;
            delete value.Other;
            delete value.Low;
            delete value.tier_sixty_four;
            delete value.tier_sixty_eight;
            delete value.tier_ninety;
            delete value.tier_zero;
            delete value.tier_seventy_six;
            delete value.tier_thirty;
            delete value.tier_fifty;
            delete value.tier_g_fifty;
            delete value.tier_forty;
            delete value.Withdrew;
            delete value.tier_twenty;
            delete value.Stddev;
            delete value.Enrolled;
            delete value.tier_fifty_five;
            delete value.tier_eighty;
            delete value.tier_sixty;
            delete value.tier_ten;
            delete value.High;
            delete value.Session;
            delete value.Campus;
            if (value.Title !== undefined || value.Subject !== undefined || value.Course !== undefined ||
                value.Avg !== undefined || value.Professor !== undefined || value.Pass !== undefined ||
                value.Fail !== undefined || value.Audit !== undefined || value.id !== undefined) {
                newArray.push(value);
            }
        });
        return newArray;
    }
}