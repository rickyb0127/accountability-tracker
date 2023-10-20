import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore/lite';

function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const selectedYear = DateTime.local().year;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [calendarList, setCalendarList] = useState(Array.from(Array(371))); // 53 weeks * 7 days
  const [startingIndex, setStartingIndex] = useState(0);
  const endingIndex = 364;
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    stroageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  }
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const getStartingIndex = () => {
    const yearStartDayOfWeek = DateTime.local(selectedYear).startOf('year').weekdayShort;

    for(let i = 0; i < days.length - 1; i++) {
      if(days[i] === yearStartDayOfWeek) {
        return i;
      }
    }
  };

  const fetchCalendarFromDb = async() => {
    const years = collection(db, 'years');
    const yearsSnapshot = await getDocs(years);
    const selectedCalendarData = yearsSnapshot.docs.reduce((result, doc) => {
      if(doc.id === selectedYear.toString()) {
        result = doc.data().calendarData;
      }
      return result;
    }, null);

    return selectedCalendarData;
  };

  const saveCalendarToDb = async() => {
    await setDoc(doc(db, "years", selectedYear.toString()), {
      calendarData : calendarList
    });
  };

  useEffect(() => {
    if(selectedYear) {
      let calendarFromDb = null;

      async function fetchData() {
        try {
          const response = await fetchCalendarFromDb();
          calendarFromDb = response;

          if(calendarFromDb) {
            setCalendarList(calendarFromDb);
          } else {
            const newCalendarList = calendarList.map((_, index) => {
              if(index >= startingIndex && index <= endingIndex) {
                const ordinalIndex = index - startingIndex + 1;
                const date = DateTime.fromObject({year: 2023, ordinal: ordinalIndex}).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
                
                return {
                  date,
                  isChecked: false
                }
              } else {
                return null;
              }
            });
      
            await saveCalendarToDb();
            setCalendarList(newCalendarList);
          }
          } catch(error) {
            console.error(error);
          }
      };
      fetchData();
      
      setStartingIndex(getStartingIndex());
      setIsAppReady(true);
    }
  }, [selectedYear]);

  const toggleDay = (day, index) => {
    if(day) {
      let updatedcalendarList = [...calendarList];
      updatedcalendarList[index].isChecked = !calendarList[index].isChecked;

      saveCalendarToDb(updatedcalendarList);
      setCalendarList(updatedcalendarList);
    }
  };

  const monthHeader = months.map((month, index) => {
    return (
      <div key={index} className="flex">
        { month }
      </div>
    )
  });

  const weekBlocks = calendarList.map((day, index) => {
    return (
      <div key={index} className="h-[18px] w-[18px] flex tooltip" onClick={ () => toggleDay(day, index) }>
        { (index >= startingIndex && index <= endingIndex) ?
          <>
            <span className="tooltiptext">{ day?.date }</span>
            <div className={`flex h-[18px] w-[18px] ${calendarList[index]?.isChecked ? "bg-green-300" : "bg-blue-50"}`}></div> 
          </> : null
        }
      </div>
    )
  });

  return (
    <>
      { isAppReady ?
        <div className="container pt-[40px]">
        <h1 className="text-2xl text-center">{ selectedYear }</h1>
        <div className="w-full h-[190px] p-[5px] rounded-sm border border-solid border-black flex flex-col">
          <div className="flex flex-row justify-between px-[30px]">{ monthHeader }</div>
          <div className="h-[150px] p-[5px] flex flex-col flex-wrap gap-[2px]">{ weekBlocks }</div>
        </div>
      </div> :
      <div>Loading</div>
      }
    </>
  )
}

export default App
