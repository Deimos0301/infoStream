import React from "react";
import styled from 'styled-components';
import DateBox, { Button } from 'devextreme-react/date-box';
import RadioGroup, { RadioGroupTypes } from 'devextreme-react/radio-group';
import { locale, loadMessages } from "devextreme/localization";
import { useEffect, useState } from 'react';
import DropDownButton from 'devextreme-react/drop-down-button';
import { NumberBox } from "devextreme-react/number-box";
import SelectBox from 'devextreme-react/select-box';
import 'devextreme/dist/css/dx.light.css';
import axios from "axios";
import ruMessages from "devextreme/localization/messages/ru.json";
import moment from 'moment';
import { alert } from 'devextreme/ui/dialog';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { CSVLink, CSVDownload } from "react-csv";



const BodyContent = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
`

const PartItem = (props) => {
    const { partName, partCode, partUrl } = props;

    loadMessages(ruMessages);
    locale(navigator.language);

    const now = new Date();
    const dateLabel = { 'aria-label': 'Date' };
    const [radio, setRadio] = useState(1);
    const [start, setStart] = useState(moment().add(-30, 'days'));
    const [end, setEnd] = useState(now);
    const [periodCode, setPeriodCode] = useState('M');
    const [spin, setSpin] = useState(1);


    const periodItems = [
        { name: "Дней", code: "D" },
        { name: "Месяцев", code: "M" },
        { name: "Лет", code: "Y" },
    ]

    const dropDownItems = [
        'JSON', "CSV", "XLSX"
    ];

    const dataItems = [
        { id: 1, text: 'Интервал дат', defaultValue: null },
        { id: 2, text: 'Фиксированный период', defaultValue: null },
    ];

    const buttonDropDownOptions = { color: 'white' };


    const onItemClick = async (e) => {
        const obj = {
            start: radio === 1 ? start : undefined,
            end: radio === 1 ? end : undefined,
            period: radio === 2 ? periodCode : undefined,
            spin: radio === 2 ? spin : undefined,
            type: e.itemData
        };
        console.log(obj);
        let url = [];
        if (obj.start) url.push(`start=${moment(obj.start).format('YYYYMMDD')}`);
        if (obj.end) url.push(`end=${moment(obj.end).format('YYYYMMDD')}`);
        if (obj.type) url.push(`type=${e.itemData}`);
        if (obj.period) url.push(`period=${obj.period}`);
        if (obj.spin) url.push(`spin=${obj.spin}`);

        // const res = await axios.get(`/api/mon?start=${moment(obj.start).format('YYYYMMDD')}&end=${moment(obj.end).format('YYYYMMDD')}&type=${e.itemData}`);

        let blob, link, href;
        let res;

        try {
            res = await axios.get(`${partUrl}?` + url.join('&'), { responseType: "blob" });
        } catch (err) {
            const js = JSON.parse(await err.response.data.text());
            alert(js.message, "Внимание").catch(() => { });
            return;
        }

        switch (e.itemData) {
            case "CSV":
                blob = new Blob(Array(res.data));

                link = document.createElement('a');
                href = URL.createObjectURL(blob);
                link.href = href;

                link.download = `${partName}_${moment().format("YYYYMMDD")}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(href);
                break;


            case 'XLSX':
                link = document.createElement('a');
                href = URL.createObjectURL(res.data);
                link.href = href;

                link.download = `${partName}_${moment().format("YYYYMMDD")}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(href);
                break;

        }
    }



    const renderContent = () => {
        return (
            Number(radio) === 1
                ?
                <BodyContent>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ marginRight: '10px', marginLeft: '10px' }}>C</div>
                        <DateBox
                            value={start}
                            onValueChanged={(e) => setStart(e.value)}
                            inputAttr={dateLabel}
                            type="date"
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ marginRight: '10px', marginLeft: '10px' }}>ПО</div>
                        <DateBox
                            value={end}
                            onValueChanged={(e) => setEnd(e.value)}
                            inputAttr={dateLabel}
                            type="date"
                        />
                    </div>
                </BodyContent>
                :
                <BodyContent>
                    <NumberBox
                        value={spin}
                        onValueChanged={(e) => { setSpin(e.value) }}
                        showSpinButtons={true}
                        min={1}
                        max={31}
                        width={100}>
                    </NumberBox>
                    <div style={{ marginLeft: '5px' }}></div>
                    <SelectBox
                        items={periodItems}
                        onValueChanged={(e) => { setPeriodCode(e.value) }}
                        value={periodCode}
                        valueExpr='code'
                        displayExpr="name" />
                </BodyContent>
        )
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: "50%", marginBottom: "20px" }}>
            <div className="partItem" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: "20px" }}>
                <RadioGroup
                    items={dataItems}
                    onValueChanged={(e) => { setRadio(e.value); console.log(e.value); }}
                    valueExpr='id'
                    displayExpr='text'
                    value={radio}
                />
            </div>
            <div style={{ marginRight: "20px" }}>{renderContent()}</div>
            <DropDownButton type="success" stylingMode="contained" text="Скачать" icon="save" items={dropDownItems} onItemClick={onItemClick} dropDownOptions={buttonDropDownOptions} />
        </div>
    );

}

export default PartItem;