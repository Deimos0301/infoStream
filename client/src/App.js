import logo from './logo.svg';
// import './App.css';
import styled from 'styled-components';
import DateBox from 'devextreme-react/date-box';
import RadioGroup, { RadioGroupTypes } from 'devextreme-react/radio-group';
import 'devextreme/dist/css/dx.light.css';
import axios from 'axios';
import { useEffect, useState } from 'react';
import PartItem from './components/partItem';





const TitleHeader = styled.div`
    background: rgb(58,45,253);
    background: linear-gradient(270deg, rgba(58,45,253,1) 0%, rgba(34,193,195,1) 100%);
    widht: '100%';
    color: black;
    font-size: 20px;
    line-height: 14px;
    font-weight: bold;
    padding-left: 10px;
    padding-top: 10px;

`;
const App = () => {
    const [parts, setParts] = useState();

    useEffect(() => {
        const load = async () => {
            const res = await axios.get("/api/parts");
            setParts(res.data);
            console.log(res.data);
        };
        load();
    }, [])

    return (
        <div className="App">
            <div style={{ marginBottom: '5px'  }}>
                {parts?.map(e =>
                    <TitleHeader>{e.name}
                        <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '20px',marginBottom: '5px'  }}>
                            <PartItem
                                partUrl={e.url}
                                partName={e.name}
                                partCode={e.code}
                            />
                        </div>
                    </TitleHeader>)}
            </div>
        </div>
    );
}

export default App;