import { so } from '../lib/format'
import { CON_BAN, sizeCua } from '../lib/mon'

// Thẻ món (Figma 242 x 128) dùng ở màn Tạo đơn và popup "Thêm món vào đơn".
// CSS nằm trong pages/TaoDon.css (.td-mon...).
//  - chonDuoc: bấm vào thẻ để chọn món
//  - dangChon: viền nổi bật khi đang chọn (popup Thêm món)
//  - onGat: có thì nút gạt Còn bán/Tạm hết bấm được; không có thì chỉ hiển thị
export default function TheMon({ mon, chonDuoc, dangChon, onChon, onGat }) {
  const conBan = mon.trangthai === CON_BAN
  return (
    <div className={'td-mon' + (chonDuoc ? ' chon-duoc' : '') + (dangChon ? ' dang-chon' : '')}
      role={chonDuoc ? 'button' : undefined} tabIndex={chonDuoc ? 0 : undefined}
      onClick={() => chonDuoc && onChon?.(mon)} onKeyDown={(e) => chonDuoc && e.key === 'Enter' && onChon?.(mon)}>
      <div className="td-mon-trong">
        <b>{mon.tenmon}</b>
        <span className="td-size">
          {sizeCua(mon).map((s) => <span key={s.ten}>Size {s.ten.toLowerCase()}-{so(s.gia)}</span>)}
        </span>
        <span className="td-mon-duoi">
          <span className={'td-con-ban' + (conBan ? '' : ' het')}>{mon.trangthai}</span>
          {onGat ? (
            <button type="button" role="switch" aria-checked={conBan} className={'td-gat' + (conBan ? ' bat' : '')}
              aria-label={`${mon.tenmon}: ${conBan ? 'chuyển sang Tạm hết' : 'chuyển sang Còn bán'}`}
              onClick={(e) => { e.stopPropagation(); onGat(mon) }} />
          ) : (
            <span className={'td-gat chi-xem' + (conBan ? ' bat' : '')} aria-hidden="true" />
          )}
        </span>
      </div>
    </div>
  )
}
